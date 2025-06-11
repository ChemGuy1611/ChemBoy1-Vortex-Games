const path = require('path');
const { fs, log, util } = require('vortex-api');
const winapi = require('winapi-bindings');

// Nexus Mods id for the game.
const GAME_ID = 'starwarsbattlefront22017';

// All SWBF2 mods will be .fbmod files
const MOD_FILE_EXT = ".fbmod";
const FROSTY_PATH = 'FrostyModManager';
const MOD_PATH = path.join(FROSTY_PATH, 'Mods', 'StarWarsBattlefrontII');
const FROSTY_EXEC = 'FrostyModManager.exe';
const FROSTY_ID = 'FrostyModManager';
const I18N_NAMESPACE = 'game-starwarsbattlefront22017';

const tools = [{
        id: 'FrostyModManagerLaunch',
        name: 'Launch Modded Game',
        logo: 'gameart.png',
        executable: () => FROSTY_EXEC,
        isPrimary: true,
        requiredFiles: [
            FROSTY_EXEC,
        ],
        relative: true,
        exclusive: true,
        parameters: [
            '-launch default',
        ],
    },
    {
        id: FROSTY_ID,
        name: 'Frosty Mod Manager',
        logo: 'frosty.png',
        executable: () => FROSTY_EXEC,
        requiredFiles: [
            FROSTY_EXEC,
        ],
        relative: true,
        exclusive: true,
    }
];

function findGame() {
    const instPath = winapi.RegGetValue(
        'HKEY_LOCAL_MACHINE',
        'Software\\Wow6432Node\\EA Games\\STAR WARS Battlefront II',
        'Install Dir');
    if (!instPath) {
        throw new Error('empty registry key');
    }
    return Promise.resolve(instPath.value);
}

function prepareForModding(context, discovery) {
    const notifId = 'missing-frosty';
    const api = context.api;
    const missingFrosty = () => new Promise((resolve, reject) => {
        return api.sendNotification({
            id: notifId,
            type: 'warning',
            message: api.translate('Frosty Mod Manager not detected', { ns: I18N_NAMESPACE }),
            allowSuppress: true,
            actions: [{
                title: 'More',
                action: () => {
                    api.showDialog('info', 'Frosty Mod Manager is missing', {
                        bbcode: api.translate('Vortex is unable to find Frosty Mod Manager. ' +
                            'Please ensure that Frosty Mod Manager is installed in the FrostModManager ' +
                            'folder under the game directory.', { ns: I18N_NAMESPACE }),
                    }, [
                        { label: 'Cancel', action: () => resolve() },
                        {
                            label: 'Download',
                            action: () => util.opn('https://frostytoolsuite.com/downloads.html')
                                .catch(err => resolve())
                                .then(() => resolve())
                        },
                    ]);
                },
            }, ],
        });
    })
    const findFrosty = () => new Promise((resolve, reject) => {
        const raiseMissingNotif = () => missingFrosty().then(() => resolve());
        const frostyPath = util.getSafe(discovery, ['tools', FROSTY_ID, 'path'], undefined);

        return (frostyPath !== undefined) ?
            fs.statAsync(frostyPath)
            .then(() => resolve())
            .catch(err => raiseMissingNotif()) :
            raiseMissingNotif();
    });
    return findFrosty().then(() => fs.ensureDirAsync(path.join(discovery.path, MOD_PATH)));
}

function installContent(files) {
    // The .fbmod file is expected to always be positioned in the mods directory we're going to disregard anything placed outside the root.
    const modFile = files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT);
    const idx = modFile.indexOf(path.basename(modFile));
    const rootPath = path.dirname(modFile);

    // Remove directories and anything that isn't in the rootPath.
    const filtered = files.filter(file =>
        ((file.indexOf(rootPath) !== -1) &&
            (!file.endsWith(path.sep))));

    const instructions = filtered.map(file => {
        return {
            type: 'copy',
            source: file,
            destination: path.join(file.substr(idx)),
        };
    });

    return Promise.resolve({ instructions });
}

function testSupportedContent(files, gameId) {
    // Make sure we're able to support this mod.
    let supported = (gameId === GAME_ID) &&
        (files.find(file => path.extname(file).toLowerCase() === MOD_FILE_EXT) !== undefined);

    // Test for a mod installer.
    if (supported && files.find(file =>
            (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
            (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
        supported = false;
    }

    return Promise.resolve({
        supported,
        requiredFiles: [],
    });
}

function main(context) {
    //This is the main function Vortex will run when detecting the game extension. 
    context.registerGame({
        id: GAME_ID,
        name: 'Star Wars: Battlefront II (2017)',
        mergeMods: true,
        queryPath: findGame,
        supportedTools: [],
        queryModPath: () => MOD_PATH,
        logo: 'gameart.png',
        executable: () => 'starwarsbattlefrontii.exe',
        setup: (discovery) => prepareForModding(context, discovery),
        supportedTools: tools,
        requiredFiles: [
            'starwarsbattlefrontii.exe'
        ],
    });

    context.registerInstaller('starwarsbattlefront22017-mod', 25, testSupportedContent, installContent);

    return true;
}

module.exports = {
    default: main,
};