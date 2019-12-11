"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load tempDirectory before it gets wiped by tool-cache
let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const os = __importStar(require("os"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const semver = __importStar(require("semver"));
const osPlat = os.platform();
const osArch = os.arch();
if (!tempDirectory) {
    let baseLocation;
    if (process.platform === 'darwin') {
        baseLocation = '/Users';
    }
    else {
        baseLocation = '/home';
    }
    tempDirectory = path.join(baseLocation, 'actions', 'temp');
}
const availableVersions = [
    '5.0.6',
    '5.0.5',
    '5.0.4',
    '5.0.3',
    '5.0.2',
    '5.0.1',
    '5.0.0',
    '4.0.14',
    '4.0.13',
    '4.0.12',
    '4.0.11',
    '4.0.10',
    '4.0.9',
    '4.0.8',
    '4.0.7',
    '4.0.6',
    '4.0.5',
    '4.0.4',
    '4.0.3',
    '4.0.2',
    '4.0.1',
    '4.0.0',
    '3.2.13',
    '3.2.12',
    '3.2.11',
    '3.2.10',
    '3.2.9',
    '3.2.8',
    '3.2.7',
    '3.2.6',
    '3.2.5',
    '3.2.4',
    '3.2.3',
    '3.2.2',
    '3.2.1',
    '3.2.0',
    '3.0.7',
    '3.0.6',
    '3.0.5',
    '3.0.4',
    '3.0.3',
    '3.0.2',
    '3.0.1',
    '3.0.0',
    '2.8.24',
    '2.8.23',
    '2.8.22',
    '2.8.21',
    '2.8.20',
    '2.8.19',
    '2.8.18',
    '2.8.17',
    '2.8.16',
    '2.8.15',
    '2.8.14',
    '2.8.13',
    '2.8.12',
    '2.8.11',
    '2.8.10',
    '2.8.9',
    '2.8.8',
    '2.8.7',
    '2.8.6',
    '2.8.5',
    '2.8.4',
    '2.8.3',
    '2.8.2',
    '2.8.1',
    '2.8.0'
];
function determineVersion(version) {
    for (let v of availableVersions) {
        if (semver.satisfies(v, version)) {
            return v;
        }
    }
    throw new Error('unable to get latest version');
}
async function getRedis(version) {
    const selected = determineVersion(version);
    // check cache
    let toolPath;
    toolPath = tc.find('redis', selected);
    if (!toolPath) {
        // download, extract, cache
        toolPath = await acquireRedis(selected);
        core.debug('redis tool is cached under ' + toolPath);
    }
    toolPath = path.join(toolPath, 'bin');
    //
    // prepend the tools path. instructs the agent to prepend for future tasks
    //
    core.addPath(toolPath);
    core.saveState('REDIS_CLI', path.join(toolPath, 'redis-cli'));
    return toolPath;
}
exports.getRedis = getRedis;
async function acquireRedis(version) {
    //
    // Download - a tool installer intimately knows how to get the tool (and construct urls)
    //
    const fileName = getFileName(version);
    const downloadUrl = await getDownloadUrl(fileName);
    let downloadPath = null;
    try {
        downloadPath = await tc.downloadTool(downloadUrl);
    }
    catch (error) {
        core.debug(error);
        throw `Failed to download version ${version}: ${error}`;
    }
    //
    // Extract
    //
    const extPath = await tc.extractTar(downloadPath);
    return await tc.cacheDir(extPath, 'redis', version);
}
function getFileName(version) {
    return `redis-${version}-${osPlat}-${osArch}.tar.gz`;
}
async function getDownloadUrl(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, '..', 'package.json'), (err, data) => {
            if (err) {
                reject(err);
            }
            const info = JSON.parse(data.toString());
            resolve(info);
        });
    }).then(info => {
        const actionsVersion = info.version;
        return `https://shogo82148-actions-setup-redis.s3.amazonaws.com/v${actionsVersion}/${filename}`;
    });
}