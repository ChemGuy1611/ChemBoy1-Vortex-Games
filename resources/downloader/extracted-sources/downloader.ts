"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.doDownload = exports.getLatestGithubReleaseAsset = exports.download = void 0;
const path_1 = __importDefault(require("path"));
const semver_1 = __importDefault(require("semver"));
const vortex_api_1 = require("vortex-api");
const axios_1 = __importDefault(require("axios"));
const common_1 = require("./common");
async function download(api, requirements, force) {
    const state = api.getState();
    const gameId = vortex_api_1.selectors.activeGameId(state);
    api.sendNotification({
        id: common_1.NOTIF_ID_REQUIREMENTS,
        message: 'Installing Requirements',
        type: 'activity',
        noDismiss: true,
        allowSuppress: false,
    });
    const batchActions = [];
    const profileId = vortex_api_1.selectors.lastActiveProfileForGame(api.getState(), gameId);
    try {
        for (const req of requirements) {
            let asset;
            let versionMismatch = false;
            const mod = await req.findMod(api);
            if (!!mod && req.resolveVersion) {
                const version = await req.resolveVersion(api);
                asset = await getLatestGithubReleaseAsset(api, req);
                const coerced = semver_1.default.coerce(asset.release.tag_name);
                if (semver_1.default.gt(coerced.version, version)) {
                    versionMismatch = true;
                    batchActions.push(vortex_api_1.actions.setModEnabled(profileId, mod.id, false));
                }
                else {
                    continue;
                }
            }
            else if (!versionMismatch && force !== true && (mod === null || mod === void 0 ? void 0 : mod.id) !== undefined) {
                batchActions.push(vortex_api_1.actions.setModEnabled(profileId, mod.id, true));
                batchActions.push(vortex_api_1.actions.setModAttribute(gameId, mod.id, 'customFileName', req.userFacingName));
                batchActions.push(vortex_api_1.actions.setModAttribute(gameId, mod.id, 'description', 'This is a modding requirement for this game - leave it enabled.'));
                continue;
            }
            if ((req === null || req === void 0 ? void 0 : req.modId) !== undefined) {
                await downloadNexus(api, req);
            }
            else {
                const dlId = req.findDownloadId(api);
                if (!versionMismatch && !force && dlId) {
                    await installDownload(api, dlId, req.userFacingName);
                    continue;
                }
                if (!asset) {
                    asset = await getLatestGithubReleaseAsset(api, req);
                }
                const tempPath = path_1.default.join(vortex_api_1.util.getVortexPath('temp'), asset.name);
                try {
                    await doDownload(asset.browser_download_url, tempPath);
                    await importAndInstall(api, tempPath, req.userFacingName);
                }
                catch (err) {
                    api.showErrorNotification('Failed to download requirements', err, { allowReport: false });
                    return;
                }
            }
        }
    }
    catch (err) {
        (0, vortex_api_1.log)('error', 'failed to download requirements', err);
        return;
    }
    finally {
        if (batchActions.length > 0) {
            vortex_api_1.util.batchDispatch(api.store, batchActions);
        }
        api.dismissNotification(common_1.NOTIF_ID_REQUIREMENTS);
    }
}
exports.download = download;
async function installDownload(api, dlId, name) {
    const state = api.getState();
    const gameId = vortex_api_1.selectors.activeGameId(state);
    return new Promise((resolve, reject) => {
        api.events.emit('start-install-download', dlId, true, (err, modId) => {
            if (err !== null) {
                api.showErrorNotification('Failed to install requirement', err, { allowReport: false });
                return reject(err);
            }
            const state = api.getState();
            const profileId = vortex_api_1.selectors.lastActiveProfileForGame(state, gameId);
            const batch = [
                vortex_api_1.actions.setModAttributes(gameId, modId, {
                    installTime: new Date(),
                    name,
                }),
                vortex_api_1.actions.setModEnabled(profileId, modId, true),
            ];
            vortex_api_1.util.batchDispatch(api.store, batch);
            return resolve();
        });
    });
}
async function importAndInstall(api, filePath, name) {
    return new Promise((resolve, reject) => {
        api.events.emit('import-downloads', [filePath], async (dlIds) => {
            const id = dlIds[0];
            if (id === undefined) {
                return reject(new vortex_api_1.util.NotFound(filePath));
            }
            const batched = [];
            batched.push(vortex_api_1.actions.setDownloadModInfo(id, 'source', 'other'));
            vortex_api_1.util.batchDispatch(api.store, batched);
            try {
                await installDownload(api, id, name);
                return resolve();
            }
            catch (err) {
                return reject(err);
            }
        });
    });
}
async function downloadNexus(api, requirement) {
    var _a, _b;
    const state = api.getState();
    const gameId = vortex_api_1.selectors.activeGameId(state);
    if (((_a = api.ext) === null || _a === void 0 ? void 0 : _a.ensureLoggedIn) !== undefined) {
        await api.ext.ensureLoggedIn();
    }
    try {
        const modFiles = await ((_b = api.ext) === null || _b === void 0 ? void 0 : _b.nexusGetModFiles(gameId, requirement.modId));
        const fileTime = (input) => Number.parseInt(input.uploaded_time, 10);
        const file = modFiles
            .filter(file => requirement.fileFilter !== undefined ? requirement.fileFilter(file.file_name) : true)
            .filter(file => file.category_id === 1)
            .sort((lhs, rhs) => fileTime(lhs) - fileTime(rhs))[0];
        if (file === undefined) {
            throw new vortex_api_1.util.ProcessCanceled('File not found');
        }
        const dlInfo = {
            game: gameId,
            name: requirement.archiveFileName,
        };
        const nxmUrl = `nxm://${gameId}/mods/${requirement.modId}/files/${file.file_id}`;
        const dlId = await vortex_api_1.util.toPromise(cb => api.events.emit('start-download', [nxmUrl], dlInfo, undefined, cb, 'never', { allowInstall: false }));
        const modId = await vortex_api_1.util.toPromise(cb => api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
        const profileId = vortex_api_1.selectors.lastActiveProfileForGame(api.getState(), gameId);
        await vortex_api_1.actions.setModsEnabled(api, profileId, [modId], true, {
            allowAutoDeploy: false,
            installed: true,
        });
    }
    catch (err) {
        api.showErrorNotification('Failed to download/install requirement', err);
        vortex_api_1.util.opn((requirement === null || requirement === void 0 ? void 0 : requirement.modUrl) || requirement.githubUrl).catch(() => null);
    }
}
async function getLatestGithubReleaseAsset(api, requirement) {
    const chooseAsset = (release) => {
        var _a;
        const assets = release.assets;
        if (!!requirement.fileArchivePattern) {
            const asset = assets.find(asset => requirement.fileArchivePattern.exec(asset.name));
            if (asset) {
                return {
                    ...asset,
                    release,
                };
            }
        }
        else {
            const asset = (_a = assets.find((asset) => asset.name.includes(requirement.archiveFileName))) !== null && _a !== void 0 ? _a : assets[0];
            return {
                ...asset,
                release,
            };
        }
    };
    try {
        const response = await axios_1.default.get(`${requirement.githubUrl}/releases/latest`);
        const resHeaders = response.headers;
        const callsRemaining = parseInt(vortex_api_1.util.getSafe(resHeaders, ['x-ratelimit-remaining'], '0'), 10);
        if ([403, 404].includes(response === null || response === void 0 ? void 0 : response.status) && (callsRemaining === 0)) {
            const resetDate = parseInt(vortex_api_1.util.getSafe(resHeaders, ['x-ratelimit-reset'], '0'), 10);
            (0, vortex_api_1.log)('info', 'GitHub rate limit exceeded', { reset_at: (new Date(resetDate)).toString() });
            return Promise.reject(new vortex_api_1.util.ProcessCanceled('GitHub rate limit exceeded'));
        }
        if (response.status === 200) {
            const release = response.data;
            if (release.assets.length > 0) {
                return chooseAsset(release);
            }
        }
    }
    catch (error) {
        api.showErrorNotification('Error fetching the latest release url for {{repName}}', error, { allowReport: false, replace: { repName: requirement.archiveFileName } });
    }
    return null;
}
exports.getLatestGithubReleaseAsset = getLatestGithubReleaseAsset;
async function doDownload(downloadUrl, destination) {
    const response = await (0, axios_1.default)({
        method: 'get',
        url: downloadUrl,
        responseType: 'arraybuffer',
        headers: {
            "Accept-Encoding": "gzip, deflate",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"
        },
    });
    const resHeaders = response.headers;
    const callsRemaining = parseInt(vortex_api_1.util.getSafe(resHeaders, ['x-ratelimit-remaining'], '0'), 10);
    if ([403, 404].includes(response === null || response === void 0 ? void 0 : response.status) && (callsRemaining === 0)) {
        const resetDate = parseInt(vortex_api_1.util.getSafe(resHeaders, ['x-ratelimit-reset'], '0'), 10);
        (0, vortex_api_1.log)('info', 'GitHub rate limit exceeded', { reset_at: (new Date(resetDate)).toString() });
        return Promise.reject(new vortex_api_1.util.ProcessCanceled('GitHub rate limit exceeded'));
    }
    await vortex_api_1.fs.writeFileAsync(destination, Buffer.from(response.data));
}
exports.doDownload = doDownload;
