'use strict';

// Shared GameBanana requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mod injectors, tools, or
// frameworks) hosted on GameBanana. The entry points take an array of
// requirement objects, processed sequentially. Each requirement's latest file
// is resolved through the GameBanana apiv11 endpoints, with an optional
// hardcoded fallback file id for when the API is unreachable. An "update
// available" notification is raised when a newer file appears on GameBanana.
// Extracted from the DOOM Eternal extension's EternalModInjector downloader.
//
// All HTTP goes through util.jsonRequest and Vortex's download manager, so the
// only external is vortex-api.
//
// Public API: downloadGameBanana, checkForGameBananaUpdate (array-based entry
// points), downloadGameBananaRequirement, checkForGameBananaUpdateRequirement
// (single-requirement variants), isGameBananaRequirementInstalled,
// getLatestGameBananaFile, getLatestGameBananaVersion.

const { actions, log, selectors, util } = require('vortex-api');

// --- requirement helpers --------------------------------------------------

// Mod attribute used to track the installed GameBanana file id.
const DEFAULT_FILE_ID_ATTRIBUTE = 'gamebananaFileId';
// Version parsed from the Updates title, e.g. "2026-05-20 (Update 6.66 Rev 3 N)".
const DEFAULT_VERSION_PATTERN = /\(Update\s+(.+?)\)/;

function fileIdAttribute(requirement) {
  return requirement.fileIdAttribute || DEFAULT_FILE_ID_ATTRIBUTE;
}

// GameBanana page for manual downloads, e.g. https://gamebanana.com/tools/7475.
// The URL slug is the lower-cased plural of the apiv11 model name (Tool -> tools).
function pageUrl(requirement) {
  return requirement.pageUrl || `https://gamebanana.com/${requirement.gbItemType.toLowerCase()}s/${requirement.gbItemId}`;
}

function filesUrl(requirement) {
  return `https://gamebanana.com/apiv11/${requirement.gbItemType}/${requirement.gbItemId}/DownloadPage`;
}

function updatesUrl(requirement) {
  return `https://gamebanana.com/apiv11/${requirement.gbItemType}/${requirement.gbItemId}/Updates?_nPage=1&_nPerpage=1`;
}

// --- GameBanana API -------------------------------------------------------

//Get the latest file for the requirement from the GameBanana API (returns null if unreachable)
async function getLatestGameBananaFile(requirement) {
  try {
    const data = await util.jsonRequest(filesUrl(requirement));
    let files = (data?._aFiles || []).filter(file => (file?._idRow && file?._sDownloadUrl));
    if (requirement.fileNamePattern) { //narrow multi-file submissions (e.g. Windows/Linux variants) to this requirement's file
      files = files.filter(file => requirement.fileNamePattern.test(String(file._sFile || '')));
    }
    if (files.length === 0) {
      return null;
    }
    files.sort((a, b) => (b._tsDateAdded || 0) - (a._tsDateAdded || 0)); //newest file first
    return files[0];
  } catch (err) {
    log('warn', `Could not get latest ${requirement.userFacingName} file from GameBanana API: ${err}`);
    return null;
  }
}

//Get the latest version for the requirement from the GameBanana API (returns null if unreachable)
async function getLatestGameBananaVersion(requirement) {
  try {
    const data = await util.jsonRequest(updatesUrl(requirement));
    const title = data?._aRecords?.[0]?._sName || '';
    const match = title.match(requirement.versionPattern || DEFAULT_VERSION_PATTERN);
    return match ? match[1] : null;
  } catch (err) {
    log('warn', `Could not get latest ${requirement.userFacingName} version from GameBanana API: ${err}`);
    return null;
  }
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running, keyed by mod type - guards
// against overlapping runs (e.g. double-clicking the toolbar download action).
const activeInstalls = new Set();

//Check if the requirement is installed (any mod with the requirement's mod type)
function isGameBananaRequirementInstalled(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).some(id => mods[id]?.type === requirement.modType);
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadGameBananaRequirement(api, gameSpec, requirement, check = true) {
  const installed = isGameBananaRequirementInstalled(api, gameSpec.game.id, requirement);
  if (installed && check) {
    return;
  }
  if (activeInstalls.has(requirement.modType)) {
    log('debug', `${requirement.userFacingName} install already running - skipping duplicate request`);
    return;
  }
  activeInstalls.add(requirement.modType);
  const NOTIF_ID = `${requirement.modType}-installing`;
  api.sendNotification({ //notification indicating install process
    id: NOTIF_ID,
    message: `Installing ${requirement.userFacingName}`,
    type: 'activity',
    noDismiss: true,
    allowSuppress: false,
  });
  try { //Download the mod
    const latestFile = await getLatestGameBananaFile(requirement); //resolve current file from GameBanana API
    const latestVersion = await getLatestGameBananaVersion(requirement);
    const dlInfo = {
      game: gameSpec.game.id,
      name: requirement.userFacingName,
    };
    //fall back to the hardcoded file id if the API is unreachable
    const fallbackUrl = requirement.fallbackFileId ? `https://gamebanana.com/dl/${requirement.fallbackFileId}` : undefined;
    const URL = latestFile ? latestFile._sDownloadUrl : fallbackUrl;
    if (!URL) {
      throw new util.ProcessCanceled('GameBanana API is unreachable and no fallback file id is set');
    }
    const dlId = await util.toPromise(cb =>
      api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
    const modId = await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
    const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModType(gameSpec.game.id, modId, requirement.modType), // Set the modType
      actions.setModAttribute(gameSpec.game.id, modId, 'version', latestVersion || requirement.fallbackVersion || ''),
      actions.setModAttribute(gameSpec.game.id, modId, fileIdAttribute(requirement), latestFile ? latestFile._idRow : Number(requirement.fallbackFileId)), // Track the installed file id for update checks
      actions.setModAttribute(gameSpec.game.id, modId, 'source', 'website'),
      actions.setModAttribute(gameSpec.game.id, modId, 'url', pageUrl(requirement)), // Shown as the mod's "Source" link in the mod details (only rendered when source === 'website')
    ];
    util.batchDispatch(api.store, batched); // Will dispatch all actions.
  } catch (err) { //Show the user the download page if the download/install process fails
    api.showErrorNotification(`Failed to download/install ${requirement.userFacingName}. You must download manually.`, err);
    util.opn(pageUrl(requirement)).catch(() => null);
  } finally {
    activeInstalls.delete(requirement.modType);
    api.dismissNotification(NOTIF_ID);
  }
}

//Download and install each requirement in the array (sequentially)
async function downloadGameBanana(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadGameBananaRequirement(api, gameSpec, requirement, check);
  }
}

//Check the GameBanana API for a newer file for a single requirement and notify the user
async function checkForGameBananaUpdateRequirement(api, gameSpec, requirement) {
  if (!isGameBananaRequirementInstalled(api, gameSpec.game.id, requirement)) {
    return;
  }
  const latestFile = await getLatestGameBananaFile(requirement);
  if (!latestFile) {
    return; //API unreachable - nothing to compare against
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const requirementMods = Object.values(mods).filter(mod => mod?.type === requirement.modType);
  const latestArchive = String(latestFile._sFile || '').toLowerCase().replace(/\.[^.]+$/, ''); //strip the archive extension (.zip, .7z, ...)
  const attr = fileIdAttribute(requirement);
  const isCurrent = requirementMods.some(mod => // match on tracked file id, or archive name for mods installed before id tracking
    (String(mod?.attributes?.[attr]) === String(latestFile._idRow))
    || ((latestArchive.length > 0) && String(mod?.attributes?.fileName || '').toLowerCase().includes(latestArchive))
  );
  if (isCurrent) {
    return;
  }
  const latestVersion = await getLatestGameBananaVersion(requirement);
  api.sendNotification({
    id: `${requirement.modType}-update`,
    type: 'warning',
    message: `${requirement.userFacingName} update available${latestVersion ? ` (${latestVersion})` : ''}`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadGameBananaRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check the GameBanana API for newer files for each requirement in the array
async function checkForGameBananaUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForGameBananaUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadGameBanana,
  checkForGameBananaUpdate,
  downloadGameBananaRequirement,
  checkForGameBananaUpdateRequirement,
  isGameBananaRequirementInstalled,
  getLatestGameBananaFile,
  getLatestGameBananaVersion,
};
