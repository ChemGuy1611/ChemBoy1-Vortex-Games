'use strict';

// Shared ModDB requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mods, tools, or launchers)
// hosted on ModDB. The entry points take an array of requirement objects,
// processed sequentially. ModDB has no official API, so each requirement's
// latest file is resolved from the page's own RSS feed (rss.moddb.com), with
// an optional hardcoded fallback file id for when the feed is unreachable. An
// "update available" notification is raised when a newer file appears in the
// feed. A requirement can instead be pinned to one file revision (pinVersion +
// pinFileId), which holds it there and makes update checks skip the feed.
//
// ModDB's www host blocks some non-browser HTTP clients at the TLS/request
// level, so the mirror URL is resolved with a renderer fetch before handing
// it to Vortex's download manager. If the download manager's request is
// also blocked, downloadModDb falls back to fetching the file directly and
// importing it as a local download. Requirements can skip the download
// manager route entirely via skipDownloadManager when the block is confirmed
// for their host.
//
// Externals are vortex-api and node's path/fs/stream (plus the global fetch
// available in the Electron 43+ renderer).
//
// Public API: downloadModDb, checkForModDbUpdate (array-based entry points),
// downloadModDbRequirement, checkForModDbUpdateRequirement (single-requirement
// variants), isModDbRequirementInstalled, getLatestModDbFile,
// getLatestModDbVersion, resolveModDbDownloadUrl.

const path = require('path');
const { createWriteStream } = require('fs'); //node's fs directly - vortex-api's createWriteStream re-export is deprecated
const { finished } = require('stream/promises');
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

// --- version pinning ------------------------------------------------------
// An opt-in pin holds a requirement at one specific file revision instead of tracking the
// newest one. pinVersion is the label shown to the user and pinFileId is the file to install:
// both are needed, because the RSS feed is newest-first with no version index. With pinVersion
// unset - the default - none of this code runs and the module behaves exactly as it does
// without it.
function isPinned(requirement) {
  if (!requirement.pinVersion) {
    return false;
  }
  if (!requirement.pinFileId) {
    log('warn', `${requirement.userFacingName} sets pinVersion without pinFileId - ignoring the pin`);
    return false;
  }
  return true;
}

//Whether the installed copy is already the pinned file, compared on the tracked file id. True
//short-circuits the update check before any HTTP request is made.
function isAtPinnedVersion(api, gameId, requirement) {
  if (!isPinned(requirement)) {
    return false;
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  const attr = fileIdAttribute(requirement);
  return Object.values(mods).some(mod => (mod?.type === requirement.modType)
    && (String(mod?.attributes?.[attr]) === String(requirement.pinFileId)));
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

//Write a fetch response body to disk without buffering it - these files can be
//several GB. The web stream is drained by hand rather than through
//Readable.fromWeb: the renderer's fetch returns Blink's ReadableStream, which
//is a different class from the node:stream/web ReadableStream that fromWeb
//brand-checks its argument against, so it always rejects it ("must be an
//instance of ReadableStream. Received an instance of ReadableStream").
async function streamToFile(body, targetPath) {
  const reader = body.getReader();
  const out = createWriteStream(targetPath);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!out.write(value)) { //respect backpressure instead of queueing the whole file in memory
        await new Promise((resolve, reject) => {
          const onDrain = () => { out.off('error', onError); resolve(); };
          const onError = (err) => { out.off('drain', onDrain); reject(err); };
          out.once('drain', onDrain);
          out.once('error', onError);
        });
      }
    }
  } catch (err) {
    await reader.cancel().catch(() => null);
    out.destroy();
    throw err;
  }
  out.end();
  return finished(out); //resolves once the file is flushed and closed
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
  try {
    // streamToFile is inside the try so a mid-stream failure still hits the cleanup below -
    // otherwise a partially written file is left behind in the temp folder.
    await streamToFile(response.body, tempPath);
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

//Mod ids currently carrying this requirement's mod type. Captured before an install so the
//previous version can be disabled once the new one lands - an update installs a second mod
//entry rather than replacing the first, and two enabled copies deploy on top of each other.
function requirementModIds(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return Object.keys(mods).filter(id => mods[id]?.type === requirement.modType);
}

//Check if the requirement is installed (any mod with the requirement's mod type)
function isModDbRequirementInstalled(api, gameId, requirement) {
  return requirementModIds(api, gameId, requirement).length > 0;
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
  //captured before the install: these are the versions being replaced
  const previousModIds = requirementModIds(api, gameSpec.game.id, requirement);
  const pinned = isPinned(requirement);
  try {
    //A pin overrides newest-file selection, and skips the feed entirely: the pinned file id is
    //all the mirror lookup below needs, so a pinned install makes no feed request.
    const latestFile = pinned ? null : await getLatestModDbFile(requirement); //resolve current file from the ModDB RSS feed
    const latestVersion = pinned ? requirement.pinVersion : getLatestModDbVersion(requirement, latestFile);
    //fall back to the hardcoded file id if the feed is unreachable
    const fileId = pinned ? requirement.pinFileId : (latestFile ? latestFile.id : requirement.fallbackFileId);
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
      actions.setModAttribute(gameSpec.game.id, modId, 'customFileName', requirement.userFacingName), // Vortex renders a mod as customFileName || logicalFileName || fileName || name, and the install pipeline stamps fileName with the archive name - without this the mod list shows the raw archive
    ];
    for (const oldModId of previousModIds) { // Disable the version this install replaces, so only one copy deploys
      if (oldModId !== modId) {
        batched.push(actions.setModEnabled(profileId, oldModId, false));
      }
    }
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
  // Pinned and already on the pinned file: nothing to check, and deliberately no HTTP request
  // at all - this is what makes a pinned requirement free against the ModDB feed.
  if (isAtPinnedVersion(api, gameSpec.game.id, requirement)) {
    return;
  }
  if (!isModDbRequirementInstalled(api, gameSpec.game.id, requirement)) {
    // Missing rather than outdated - install it instead of checking for updates to something
    // that is not there. Requirements the user installs manually opt out with autoInstall: false.
    if (requirement.autoInstall === false) {
      return;
    }
    log('info', `${requirement.userFacingName} is not installed - installing it`);
    return downloadModDbRequirement(api, gameSpec, requirement);
  }
  if (isPinned(requirement)) {
    // Installed, but not the pinned file. The wording covers a user who is ahead of the pin as
    // well as behind it - installing it from that state is a deliberate downgrade.
    api.sendNotification({
      id: `${requirement.modType}-update`,
      type: 'warning',
      message: `${requirement.userFacingName} pinned version available (${requirement.pinVersion})`,
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
