'use strict';

// Shared ModDB requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mods, tools, or launchers)
// hosted on ModDB. The entry points take an array of requirement objects,
// processed sequentially. ModDB has no official API, so each requirement's
// latest file is resolved from the page's own RSS feed (rss.moddb.com), with
// an optional hardcoded fallback file id for when the feed is unreachable. An
// "update available" notification is raised when a newer file appears in the
// feed.
//
// ModDB's www host blocks some non-browser HTTP clients at the TLS/request
// level, so the mirror URL is resolved with a renderer fetch before handing
// it to Vortex's download manager. If the download manager's request is
// also blocked, downloadModDb falls back to fetching the file directly and
// importing it as a local download. Requirements can skip the download
// manager route entirely via skipDownloadManager when the block is confirmed
// for their host.
//
// Externals are vortex-api and node's path/stream (plus the global fetch
// available in the Electron 43+ renderer).
//
// Public API: downloadModDb, checkForModDbUpdate (array-based entry points),
// downloadModDbRequirement, checkForModDbUpdateRequirement (single-requirement
// variants), isModDbRequirementInstalled, getLatestModDbFile,
// getLatestModDbVersion, resolveModDbDownloadUrl.

const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const { actions, fs, log, selectors, util } = require('vortex-api');

// --- requirement helpers --------------------------------------------------

// Mod attribute used to track the installed ModDB file id.
const DEFAULT_FILE_ID_ATTRIBUTE = 'moddbFileId';
// Version parsed from the RSS item title, e.g. "[wOS] Dark Messiah Mod Launcher [R1-08.16]".
const DEFAULT_VERSION_PATTERN = /\[([^[\]]+)\]\s*$/;

function fileIdAttribute(requirement) {
  return requirement.fileIdAttribute || DEFAULT_FILE_ID_ATTRIBUTE;
}

// ModDB page for manual downloads, e.g. https://www.moddb.com/games/<slug>/downloads.
function pageUrl(requirement) {
  return requirement.pageUrl || `https://www.moddb.com/${requirement.moddbPath}/downloads`;
}

function rssUrl(requirement) {
  return `https://rss.moddb.com/${requirement.moddbPath}/downloads/feed/rss.xml`;
}

// --- ModDB RSS feed --------------------------------------------------------

function decodeEntities(text) {
  return String(text || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function parseModDbRssItems(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const guid = (block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1];
    const idMatch = guid ? guid.match(/downloads(\d+)/) : null;
    if (!idMatch) {
      continue; //not a file item
    }
    const title = decodeEntities((block.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    const link = decodeEntities((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1]);
    const pubDate = (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    items.push({
      id: idMatch[1],
      title,
      link,
      date: pubDate ? new Date(pubDate) : new Date(0),
    });
  }
  return items;
}

//Get the latest file for the requirement from the ModDB RSS feed (returns null if unreachable)
async function getLatestModDbFile(requirement) {
  try {
    const response = await fetch(rssUrl(requirement));
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const xml = await response.text();
    let items = parseModDbRssItems(xml);
    if (requirement.filePattern) {
      items = items.filter(item => requirement.filePattern.test(item.title));
    }
    if (items.length === 0) {
      return null;
    }
    items.sort((a, b) => b.date - a.date); //newest file first
    return items[0];
  } catch (err) {
    log('warn', `Could not get latest ${requirement.userFacingName} file from ModDB RSS feed: ${err}`);
    return null;
  }
}

//Get the version embedded in the RSS item title (returns null if no match)
function getLatestModDbVersion(requirement, file) {
  if (!file) {
    return null;
  }
  const match = file.title.match(requirement.versionPattern || DEFAULT_VERSION_PATTERN);
  return match ? match[1] : null;
}

//Resolve the direct mirror download URL for a ModDB file id (returns null if unreachable)
async function resolveModDbDownloadUrl(fileId) {
  try {
    const response = await fetch(`https://www.moddb.com/downloads/start/${fileId}`);
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    const html = await response.text();
    const match = html.match(/href="([^"]*\/downloads\/mirror\/[^"]*)"/i);
    if (!match) {
      return null;
    }
    const href = decodeEntities(match[1]); //hrefs in HTML may carry entity-encoded characters (e.g. &amp;)
    return href.startsWith('http') ? href : `https://www.moddb.com${href}`;
  } catch (err) {
    log('warn', `Could not resolve ModDB mirror URL for file ${fileId}: ${err}`);
    return null;
  }
}

function filenameFromResponse(response, requirement) {
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (match) {
      return path.basename(decodeURIComponent(match[1])); //basename guards against path separators in the header
    }
  }
  try {
    const urlName = path.basename(new URL(response.url).pathname);
    if (urlName) {
      return urlName;
    }
  } catch (err) {
    // fall through to the requirement-provided name
  }
  return requirement.archiveFileName || `${requirement.modType}.zip`;
}

//Fetch the file in the renderer (real Chromium network stack), stream it to a
//temp file, and import + install it through Vortex ('cause' preserves the
//download-manager error when this runs as the fallback route)
async function fetchAndImportModDbFile(api, requirement, url, cause) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status code ${response.status} (${url})`, { cause });
  }
  const tempPath = path.join(util.getVortexPath('temp'), filenameFromResponse(response, requirement));
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(tempPath)); //stream to disk - files can be large
  try {
    // 'import-downloads' calls back with (dlIds) - no error argument - unlike
    // 'start-download'/'start-install-download', so it can't go through util.toPromise.
    const dlId = await new Promise((resolve, reject) => {
      api.events.emit('import-downloads', [tempPath], (dlIds) => {
        const id = dlIds?.[0];
        return id === undefined ? reject(new util.NotFound(tempPath)) : resolve(id);
      });
    });
    return await util.toPromise(cb =>
      api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
  } finally {
    await fs.removeAsync(tempPath).catch(() => null);
  }
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running, keyed by mod type - guards
// against overlapping runs (e.g. double-clicking the toolbar download action).
const activeInstalls = new Set();

//Check if the requirement is installed (any mod with the requirement's mod type)
function isModDbRequirementInstalled(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).some(id => mods[id]?.type === requirement.modType);
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadModDbRequirement(api, gameSpec, requirement, check = true) {
  const installed = isModDbRequirementInstalled(api, gameSpec.game.id, requirement);
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
  try {
    const latestFile = await getLatestModDbFile(requirement); //resolve current file from the ModDB RSS feed
    const latestVersion = getLatestModDbVersion(requirement, latestFile);
    const fileId = latestFile ? latestFile.id : requirement.fallbackFileId; //fall back to the hardcoded file id if the feed is unreachable
    if (!fileId) {
      throw new util.ProcessCanceled('ModDB RSS feed is unreachable and no fallback file id is set');
    }
    const mirrorUrl = await resolveModDbDownloadUrl(fileId);
    if (!mirrorUrl) {
      throw new util.ProcessCanceled('Could not resolve a ModDB mirror URL for the file');
    }
    const dlInfo = {
      game: gameSpec.game.id,
      name: requirement.userFacingName,
    };
    let modId;
    if (requirement.skipDownloadManager) { //opt-out for hosts where the download-manager route is confirmed blocked
      modId = await fetchAndImportModDbFile(api, requirement, mirrorUrl);
    } else {
      try { //primary route: hand the mirror URL to Vortex's download manager
        const dlId = await util.toPromise(cb =>
          api.events.emit('start-download', [mirrorUrl], dlInfo, undefined, cb, undefined, { allowInstall: false }));
        modId = await util.toPromise(cb =>
          api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      } catch (dlErr) { //fallback route: ModDB's www host blocks some non-browser clients - fetch it directly instead
        log('warn', `start-download failed for ${requirement.userFacingName}, falling back to direct fetch: ${dlErr}`);
        const retryUrl = (await resolveModDbDownloadUrl(fileId)) || mirrorUrl; //mirror links can be single-use
        modId = await fetchAndImportModDbFile(api, requirement, retryUrl, dlErr);
      }
    }
    const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModType(gameSpec.game.id, modId, requirement.modType), // Set the modType
      actions.setModAttribute(gameSpec.game.id, modId, 'version', latestVersion || requirement.fallbackVersion || ''),
      actions.setModAttribute(gameSpec.game.id, modId, fileIdAttribute(requirement), latestFile ? Number(latestFile.id) : Number(fileId)), // Track the installed file id for update checks
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
async function downloadModDb(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadModDbRequirement(api, gameSpec, requirement, check);
  }
}

//Check the ModDB RSS feed for a newer file for a single requirement and notify the user
async function checkForModDbUpdateRequirement(api, gameSpec, requirement) {
  if (!isModDbRequirementInstalled(api, gameSpec.game.id, requirement)) {
    return;
  }
  const latestFile = await getLatestModDbFile(requirement);
  if (!latestFile) {
    return; //feed unreachable - nothing to compare against
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const requirementMods = Object.values(mods).filter(mod => mod?.type === requirement.modType);
  const attr = fileIdAttribute(requirement);
  const isCurrent = requirementMods.some(mod => String(mod?.attributes?.[attr]) === String(latestFile.id));
  if (isCurrent) {
    return;
  }
  const latestVersion = getLatestModDbVersion(requirement, latestFile);
  api.sendNotification({
    id: `${requirement.modType}-update`,
    type: 'warning',
    message: `${requirement.userFacingName} update available${latestVersion ? ` (${latestVersion})` : ''}`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadModDbRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check the ModDB RSS feed for newer files for each requirement in the array
async function checkForModDbUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForModDbUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadModDb,
  checkForModDbUpdate,
  downloadModDbRequirement,
  checkForModDbUpdateRequirement,
  isModDbRequirementInstalled,
  getLatestModDbFile,
  getLatestModDbVersion,
  resolveModDbDownloadUrl,
};
