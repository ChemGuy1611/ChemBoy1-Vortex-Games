'use strict';

// Shared ModWorkshop requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mod loaders, tools, or
// frameworks) hosted on ModWorkshop. The entry points take an array of
// requirement objects, processed sequentially. Each requirement's current file
// is resolved through the ModWorkshop REST API, with an optional hardcoded
// fallback file id for when the API is unreachable. An "update available"
// notification is raised when a newer file appears on ModWorkshop.
//
// ModWorkshop's API returns a complete, unauthenticated download URL on every
// file record, so - unlike the GitHub, GameBanana, and ModDB counterparts -
// there is no URL resolution step and no direct-fetch fallback route: the URL
// goes straight to Vortex's download manager. The API host is also not behind
// the bot protection that guards the modworkshop.net web host, so requests
// work from either Electron process.
//
// All HTTP goes through util.jsonRequest and Vortex's download manager, so the
// only externals are semver and vortex-api.
//
// Public API: downloadModWorkshop, checkForModWorkshopUpdate (array-based
// entry points), downloadModWorkshopRequirement,
// checkForModWorkshopUpdateRequirement (single-requirement variants),
// isModWorkshopRequirementInstalled, getLatestModWorkshopFile,
// getLatestModWorkshopVersion.

const semver = require('semver');
const { actions, log, selectors, util } = require('vortex-api');

const API_BASE = 'https://api.modworkshop.net';

// --- requirement helpers --------------------------------------------------

// Mod attribute used to track the installed ModWorkshop file id.
const DEFAULT_FILE_ID_ATTRIBUTE = 'modworkshopFileId';
// Files are listed 20 at a time by default; the API caps limit at 50.
const FILE_PAGE_LIMIT = 50;
// Mirrors Vortex's own knownArchiveExt set. That set is hardcoded in core and
// registerArchiveType cannot extend it, so a file with any other extension is
// never treated as an archive by the download/install UI - ModWorkshop's own
// .vmz format is the common offender. Used for a warning only.
const KNOWN_ARCHIVE_EXT = [
  'zip', '7z', 'rar', 'tar', 'gz', 'gzip', 'tgz', 'bz2', 'bzip2', 'tbz2',
  'xz', 'txz', 'lzma', 'lzh', 'z', 'zst', 'zstd', 'cab', 'arj',
  'z01', 'r00', '001', 'fomod', 'dazip',
];

function fileIdAttribute(requirement) {
  return requirement.fileIdAttribute || DEFAULT_FILE_ID_ATTRIBUTE;
}

// ModWorkshop page for manual downloads, e.g. https://modworkshop.net/mod/55623.
function pageUrl(requirement) {
  return requirement.pageUrl || `https://modworkshop.net/mod/${requirement.mwsModId}`;
}

function filesUrl(requirement) {
  return `${API_BASE}/mods/${requirement.mwsModId}/files?limit=${FILE_PAGE_LIMIT}`;
}

function primaryFileUrl(requirement) {
  return `${API_BASE}/mods/${requirement.mwsModId}/files/primary`;
}

// The API stores the display name and the extension separately, but only
// sometimes - zip uploads often carry the extension in the name already.
function fileName(file) {
  const name = String(file?.name || '');
  const type = String(file?.type || '');
  if ((type.length === 0) || name.toLowerCase().endsWith(`.${type.toLowerCase()}`)) {
    return name;
  }
  return `${name}.${type}`;
}

// Authors enter versions by hand, so a leading "v" and non-semver forms both occur.
function normalizeVersion(raw) {
  const coerced = semver.coerce(String(raw || '').replace(/^v/i, ''));
  return coerced ? coerced.version : null;
}

// Newest first: by version where both files carry a usable one, upload date otherwise.
function compareFiles(lhs, rhs) {
  const lhsVersion = normalizeVersion(lhs?.version);
  const rhsVersion = normalizeVersion(rhs?.version);
  if (lhsVersion && rhsVersion && !semver.eq(lhsVersion, rhsVersion)) {
    return semver.gt(rhsVersion, lhsVersion) ? 1 : -1;
  }
  return Date.parse(rhs?.created_at || 0) - Date.parse(lhs?.created_at || 0);
}

// --- ModWorkshop API ------------------------------------------------------

//Get the current file for the requirement from the ModWorkshop API (returns null if unreachable)
async function getLatestModWorkshopFile(requirement) {
  try {
    let file = null;
    if (requirement.fileType || requirement.filePattern) { //narrow multi-file submissions (e.g. .zip and .vmz variants) to this requirement's file
      const data = await util.jsonRequest(filesUrl(requirement));
      let files = (data?.data || []).filter(entry => (entry?.id && entry?.download_url));
      if (requirement.fileType) {
        files = files.filter(entry => String(entry.type || '').toLowerCase() === String(requirement.fileType).toLowerCase());
      }
      if (requirement.filePattern) {
        files = files.filter(entry => requirement.filePattern.test(fileName(entry)));
      }
      if (files.length === 0) {
        return null;
      }
      files.sort(compareFiles);
      file = files[0];
    } else { //the primary file is what the site's own download button serves
      //NOTE: /files/latest is deliberately not used - it orders by the author-controlled
      //display_order before version, so it can return an older file than the primary one.
      const primary = await util.jsonRequest(primaryFileUrl(requirement));
      file = (primary?.id && primary?.download_url) ? primary : null;
    }
    if (file && !KNOWN_ARCHIVE_EXT.includes(String(file.type || '').toLowerCase())) {
      log('warn', `${requirement.userFacingName}: ModWorkshop file ${fileName(file)} does not use a known archive extension - `
        + `Vortex will not treat it as an archive. Set fileType on the requirement to pick a standard archive instead.`);
    }
    return file;
  } catch (err) {
    log('warn', `Could not get latest ${requirement.userFacingName} file from ModWorkshop API: ${err}`);
    return null;
  }
}

//Get the version for the given file, falling back to the mod record's own version (returns null if unavailable)
async function getLatestModWorkshopVersion(requirement, file) {
  const fromFile = file?.version;
  if (fromFile) {
    return normalizeVersion(fromFile) || String(fromFile);
  }
  try {
    const mod = await util.jsonRequest(`${API_BASE}/mods/${requirement.mwsModId}`);
    const version = mod?.version;
    return version ? (normalizeVersion(version) || String(version)) : null;
  } catch (err) {
    log('warn', `Could not get latest ${requirement.userFacingName} version from ModWorkshop API: ${err}`);
    return null;
  }
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running, keyed by mod type - guards
// against overlapping runs (e.g. double-clicking the toolbar download action).
const activeInstalls = new Set();

//Check if the requirement is installed (any mod with the requirement's mod type)
function isModWorkshopRequirementInstalled(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).some(id => mods[id]?.type === requirement.modType);
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadModWorkshopRequirement(api, gameSpec, requirement, check = true) {
  const installed = isModWorkshopRequirementInstalled(api, gameSpec.game.id, requirement);
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
    const latestFile = await getLatestModWorkshopFile(requirement); //resolve current file from ModWorkshop API
    const latestVersion = await getLatestModWorkshopVersion(requirement, latestFile);
    const dlInfo = {
      game: gameSpec.game.id,
      name: requirement.userFacingName,
    };
    //fall back to the hardcoded file id if the API is unreachable - this endpoint redirects to the same storage URL
    const fallbackUrl = requirement.fallbackFileId ? `${API_BASE}/files/${requirement.fallbackFileId}/download` : undefined;
    const URL = latestFile ? latestFile.download_url : fallbackUrl;
    if (!URL) {
      throw new util.ProcessCanceled('ModWorkshop API is unreachable and no fallback file id is set');
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
      actions.setModAttribute(gameSpec.game.id, modId, fileIdAttribute(requirement), latestFile ? latestFile.id : Number(requirement.fallbackFileId)), // Track the installed file id for update checks
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
async function downloadModWorkshop(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadModWorkshopRequirement(api, gameSpec, requirement, check);
  }
}

//Check the ModWorkshop API for a newer file for a single requirement and notify the user
async function checkForModWorkshopUpdateRequirement(api, gameSpec, requirement) {
  if (!isModWorkshopRequirementInstalled(api, gameSpec.game.id, requirement)) {
    return;
  }
  const latestFile = await getLatestModWorkshopFile(requirement);
  if (!latestFile) {
    return; //API unreachable - nothing to compare against
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const requirementMods = Object.values(mods).filter(mod => mod?.type === requirement.modType);
  const latestArchive = fileName(latestFile).toLowerCase().replace(/\.[^.]+$/, ''); //strip the archive extension (.zip, .7z, ...)
  const attr = fileIdAttribute(requirement);
  const isCurrent = requirementMods.some(mod => // match on tracked file id, or archive name for mods installed before id tracking
    (String(mod?.attributes?.[attr]) === String(latestFile.id))
    || ((latestArchive.length > 0) && String(mod?.attributes?.fileName || '').toLowerCase().includes(latestArchive))
  );
  if (isCurrent) {
    return;
  }
  const latestVersion = await getLatestModWorkshopVersion(requirement, latestFile);
  api.sendNotification({
    id: `${requirement.modType}-update`,
    type: 'warning',
    message: `${requirement.userFacingName} update available${latestVersion ? ` (${latestVersion})` : ''}`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadModWorkshopRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check the ModWorkshop API for newer files for each requirement in the array
async function checkForModWorkshopUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForModWorkshopUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadModWorkshop,
  checkForModWorkshopUpdate,
  downloadModWorkshopRequirement,
  checkForModWorkshopUpdateRequirement,
  isModWorkshopRequirementInstalled,
  getLatestModWorkshopFile,
  getLatestModWorkshopVersion,
};
