"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkPath = exports.resolveVersionByPattern = exports.findDownloadIdByFile = exports.findModByFile = exports.getMods = void 0;
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const vortex_api_1 = require("vortex-api");
const turbowalk_1 = __importDefault(require("turbowalk"));
function getMods(api, modType) {
    const state = api.getState();
    const gameId = vortex_api_1.selectors.activeGameId(state);
    const mods = vortex_api_1.util.getSafe(state, ['persistent', 'mods', gameId], {});
    return Object.values(mods).filter((mod) => mod.type === modType || mod.type === '');
}
exports.getMods = getMods;
async function findModByFile(api, modType, fileName) {
    const state = api.getState();
    const gameId = vortex_api_1.selectors.activeGameId(state);
    const mods = getMods(api, modType);
    const installationPath = vortex_api_1.selectors.installPathForGame(api.getState(), gameId);
    for (const mod of mods) {
        const modPath = path_1.default.join(installationPath, mod.installationPath);
        const files = await walkPath(modPath);
        if (files.find(file => file.filePath.endsWith(fileName))) {
            return mod;
        }
    }
    return undefined;
}
exports.findModByFile = findModByFile;
function findDownloadIdByFile(api, fileName) {
    const state = api.getState();
    state.persistent.downloads.files;
    const downloads = vortex_api_1.util.getSafe(state, ['persistent', 'downloads', 'files'], {});
    return Object.entries(downloads).reduce((prev, [dlId, dl]) => {
        if (path_1.default.basename(dl.localPath).toLowerCase() === fileName.toLowerCase()) {
            prev = dlId;
        }
        return prev;
    }, '');
}
exports.findDownloadIdByFile = findDownloadIdByFile;
async function resolveVersionByPattern(api, requirement) {
    const state = api.getState();
    const files = vortex_api_1.util.getSafe(state, ['persistent', 'downloads', 'files'], []);
    const latestVersion = Object.values(files).reduce((prev, file) => {
        const match = requirement.fileArchivePattern.exec(file.localPath);
        if ((match === null || match === void 0 ? void 0 : match[1]) && semver_1.default.gt(match[1], prev)) {
            prev = match[1];
        }
        return prev;
    }, '0.0.0');
    return latestVersion;
}
exports.resolveVersionByPattern = resolveVersionByPattern;
async function walkPath(dirPath, walkOptions) {
    walkOptions = !!walkOptions
        ? { ...walkOptions, skipHidden: true, skipInaccessible: true, skipLinks: true }
        : { skipLinks: true, skipHidden: true, skipInaccessible: true };
    const walkResults = [];
    return new Promise(async (resolve, reject) => {
        await (0, turbowalk_1.default)(dirPath, (entries) => {
            walkResults.push(...entries);
            return Promise.resolve();
        }, walkOptions).catch(err => err.code === 'ENOENT' ? Promise.resolve() : Promise.reject(err));
        return resolve(walkResults);
    });
}
exports.walkPath = walkPath;
