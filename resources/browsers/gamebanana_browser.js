'use strict';

// Shared GameBanana browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live gamebanana.com site inside Vortex.
// The user browses the real site - search, categories, submission pages, screenshots -
// and a click on a download link becomes a managed Vortex install: the archive is
// claimed, the mod is enabled, and its submission and version are stamped as attributes.
//
// The page, the claim, the install driver and the update check all live in
// base_browser.js. This file is the GameBanana adapter: the URL shapes, the API calls,
// the key format, and the visited-submission ring the claim is matched against. An
// adopting extension carries BOTH files, because this one requires the base from beside it.
//
// GameBanana differs from Thunderstore in four ways that shape this adapter:
//
//   1. A download URL carries a *file* id (gamebanana.com/dl/{fileId}) and the CDN URL it
//      redirects to carries only a section and a file name - neither identifies the
//      submission the file belongs to, and no API endpoint maps a file id back to its
//      submission. So the page records the submissions the user visits, and a claimed
//      download is matched against those candidates by file id or file name.
//   2. There is no dependency graph, so nothing is offered for installation alongside a mod.
//   3. Versions are free text (_sVersion, or a version embedded in an update title), so
//      updates are compared by file id, not by semver.
//   4. The site carries ads, so the page hides their slots and drops their pop-unders.
//
// All game-specific knowledge arrives in one config object, so a second game adopts the
// module by copying both files and writing a config. Every adopter carries byte-identical
// copies of the canonical files in resources/browsers/.
//
// Config:
//   gbGameId             (required) GameBanana game id - sets the home URL, e.g. 8756
//   gbSection            site section the page opens on (default 'mods')
//   homeUrl              full override for the page's home URL
//   requirements         the adopter's requirement table (gamebanana_downloader.js shape)
//   installRequirement   (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute     mod attribute holding "Model-itemId" (default gamebananaItem)
//   versionAttribute     mod attribute holding the installed version (default gamebananaVersion)
//   fileIdAttribute      mod attribute holding the installed file id (default gamebananaFileId)
//   versionPattern       RegExp whose group 1 is a version inside an update title
//   allowedHosts         hosts the embedded view may navigate to
//   hideAds              false to stop hiding the site's ad slots (default true)
//   adSelectors          CSS selectors hidden in the embedded view, replacing the defaults
//   blockAdPopups        false to let ad destinations open in the system browser (default true)
//   blockedHosts         ad hosts whose links are dropped, replacing the defaults
//   confirmExternal      show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// Public API: registerGameBananaBrowser, onceGameBananaBrowser,
// makeGameBananaBrowsePage, installGameBananaItem, resolveGameBananaItem,
// isGameBananaItemInstalled, checkGameBananaModUpdates.

const { log, util } = require('vortex-api');
const { createBrowserModule } = require('./base_browser');

const SITE_BASE = 'https://gamebanana.com';
const API_BASE = 'https://gamebanana.com/apiv11';

// Mod attributes. Dedicated attributes rather than the standard 'version' one because
// Vortex's md5 meta lookup can overwrite 'version' with data from an unrelated Nexus match.
// The file id attribute is deliberately the same one gamebanana_downloader.js tracks, so a
// requirement installed by either route is recognised by both.
const DEFAULT_PACKAGE_ATTRIBUTE = 'gamebananaItem';
const DEFAULT_VERSION_ATTRIBUTE = 'gamebananaVersion';
const DEFAULT_FILE_ID_ATTRIBUTE = 'gamebananaFileId';

// Hosts the embedded view stays on. One entry covers the whole site: downloads redirect to
// files.gamebanana.com and then to a numbered filecacheNN.gamebanana.com mirror, and images
// come from images.gamebanana.com - all of which end in ".gamebanana.com".
const DEFAULT_ALLOWED_HOSTS = ['gamebanana.com'];

// Section the page opens on. GameBanana section listings are /{section}/games/{gameId}.
const DEFAULT_SECTION = 'mods';

// Version embedded in an update title, e.g. "2026-05-20 (Update 6.66 Rev 3 N)". Same default
// as gamebanana_downloader.js - submitters who fill in _sVersion make this unnecessary.
const DEFAULT_VERSION_PATTERN = /\(Update\s+(.+?)\)/;

// Sidebar icon: GameBanana's own banana mark, traced from the site's banana.png
// (images.gamebanana.com/static/img/banana.png). That file is a 2x blow-up of a native 16x16
// pixel-art sprite, so the silhouette is traced on the sprite's grid and placed in a 20x20 box
// inside the 24x24 viewBox - every coordinate is a multiple of 1.25, and the steps are the
// sprite's own, not an approximation of them.
const DEFAULT_MDI = 'M9.5 14.5V13.25H13.25V12H14.5V8.25H15.75V4.5H14.5V2H18.25V4.5H19.5V5.75H20.75V7H22V15.75H20.75V18.25H19.5V19.5H18.25V20.75H15.75V22H7V20.75H4.5V19.5H3.25V18.25H2V14.5z';

// Ad slots hidden in the embedded view, verified against a live GameBanana mod page in August 2026.
// .AdTagModule is the wrapper GameBanana puts on both its leaderboard and square units, the Playwire
// units carry data-pw-desk (#pwDeskLbAtf, #pwDeskMedRectAtf), and the appeal panel asks the user to
// turn off an ad blocker - which is exactly what this makes redundant. The last three are generic.
// This is cosmetic only: the requests still happen, the page just stops showing the result. Blocking
// the requests themselves would mean reaching into the session Vortex downloads through.
const DEFAULT_AD_SELECTORS = [
  '.AdTagModule',
  '#AdBlockAppealModule',
  '[data-pw-desk]',
  '[id^="pwDesk"]',
  'ins.adsbygoogle',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
];

// Hosts an ad click or pop-under leads to. Without this they reach util.opn and open in the user's
// real browser, which is worse than the ad itself.
const DEFAULT_BLOCKED_HOSTS = [
  'doubleclick.net', 'googlesyndication.com', 'googletagservices.com', 'adnxs.com',
  'rubiconproject.com', 'playwire.com', 'pubmatic.com', 'openx.net', 'amazon-adsystem.com',
  'criteo.com', 'taboola.com', 'outbrain.com', 'adsafeprotected.com', 'moatads.com',
  'scorecardresearch.com',
];

// How many recently visited submissions a claimed download may be matched against.
const VISITED_ITEMS_CAP = 8;

// --- config helpers -------------------------------------------------------

function fileIdAttribute(config) {
  return config.fileIdAttribute || DEFAULT_FILE_ID_ATTRIBUTE;
}

//Section listing for this game - what the embedded view opens on, and what Home returns to
function homeUrl(config) {
  return config.homeUrl
    || `${SITE_BASE}/${config.gbSection || DEFAULT_SECTION}/games/${config.gbGameId}`;
}

// GameBanana URL slugs are the lower-cased plural of the apiv11 model name, the same rule
// gamebanana_downloader.js uses to build its page URLs.
function sectionForModel(model) {
  return `${String(model).toLowerCase()}s`;
}

// The inverse, as an explicit map: de-pluralising an arbitrary path segment would turn
// /games/8756 into the "Game" model and claim a listing page as a submission.
const SECTION_MODELS = {
  mods: 'Mod',
  tools: 'Tool',
  sounds: 'Sound',
  wips: 'Wip',
  scripts: 'Script',
  sprays: 'Spray',
  models: 'Model',
  wares: 'Ware',
  tutorials: 'Tutorial',
  concepts: 'Concept',
  effects: 'Effect',
  skins: 'Skin',
  maps: 'Map',
  guis: 'Gui',
  threads: 'Thread',
};

function modelForSection(section) {
  return SECTION_MODELS[String(section).toLowerCase()] || null;
}

//Submission page for a reference, used as the mod's "Source" link
function itemPageUrl(ref) {
  return `${SITE_BASE}/${sectionForModel(ref.model)}/${ref.itemId}`;
}

//Direct download for a known file id - the same URL the site's own download button uses
function fileDownloadUrl(fileId) {
  return `${SITE_BASE}/dl/${fileId}`;
}

//"Model-itemId" - the key everything in this module is tracked by
function itemKey(ref) {
  return `${ref.model}-${ref.itemId}`;
}

//Model names are letters and item ids are digits, so the key parses without a hyphen rule
const ITEM_KEY_RE = /^([A-Za-z]+)-(\d+)$/;

function parseItemKey(key) {
  const matched = ITEM_KEY_RE.exec(String(key || ''));
  if (matched === null) {
    return null;
  }
  return { model: matched[1], itemId: matched[2] };
}

// --- URL parsing ----------------------------------------------------------

// gamebanana.com/{section}/{itemId} and gamebanana.com/{section}/download/{itemId} - the
// submission page and its download page, which is where a download click comes from
const ITEM_URL_RE = /gamebanana\.com\/([a-z]+)\/(?:download\/)?(\d+)(?:[/?#]|$)/i;
// gamebanana.com/dl/{fileId} - what a download click hits
const DOWNLOAD_URL_RE = /gamebanana\.com\/dl\/(\d+)/i;
// the "1-Click Install" link's target, optionally carrying the submission it belongs to
const MMDL_URL_RE = /gamebanana\.com\/mmdl\/(\d+)(?:,([A-Za-z]+),(\d+))?/i;
// the CDN the download URL redirects to: /{section}/{fileName}, no ids at all
const CDN_URL_RE = /\/\/(?:files|filecache\d*)\.gamebanana\.com\/([^/?#]+)\/([^/?#]+)/i;

//Parse a submission reference out of a page URL (returns null when it is not a submission page)
function parseItemRef(url) {
  const matched = ITEM_URL_RE.exec(String(url || ''));
  if (matched === null) {
    return null;
  }
  const model = modelForSection(matched[1]);
  if (model === null) {
    return null;
  }
  return { model, itemId: matched[2] };
}

//Parse what a download URL reveals: a file id, and sometimes the submission (returns null
//when the URL is not a GameBanana download at all)
function parseDownloadRef(url) {
  const input = String(url || '');
  const mmdl = MMDL_URL_RE.exec(input);
  if (mmdl !== null) {
    return (mmdl[2] !== undefined)
      ? { fileId: mmdl[1], model: mmdl[2], itemId: mmdl[3] }
      : { fileId: mmdl[1] };
  }
  const direct = DOWNLOAD_URL_RE.exec(input);
  if (direct !== null) {
    return { fileId: direct[1] };
  }
  const cdn = CDN_URL_RE.exec(input);
  if (cdn !== null) { //the CDN path's first segment is the section, which gives the model
    const model = modelForSection(cdn[1]);
    return (model !== null) ? { model, fileName: cdn[2] } : { fileName: cdn[2] };
  }
  return null;
}

// --- visited submissions --------------------------------------------------

// Submissions the user opened in the page, newest first. A claimed download's file id cannot
// be traced back to its submission through any API, so these are the candidates it is matched
// against. They live in the base's per-page adapter state, so two games never share a ring.

function noteVisitedItem(adapterState, ref) {
  const previous = (adapterState.visited || [])
    .filter(entry => itemKey(entry) !== itemKey(ref));
  adapterState.visited = [{ ...ref, visitedAt: Date.now() }, ...previous].slice(0, VISITED_ITEMS_CAP);
}

function visitedCandidates(adapterState) {
  return adapterState.visited || [];
}

// --- GameBanana API -------------------------------------------------------

// GameBanana serves apiv11 responses with "Content-Type: text/html" (verified against every
// endpoint in August 2026 - an occasional Cloudflare BYPASS response says application/json, the
// cached ones do not). util.jsonRequest only accepts application/json or text/plain and rejects
// anything else outright, replacing the error message with the response body, so every call
// through it fails even though the body is valid JSON. The raw request is therefore made here
// with a content type this API actually sends, and parsed locally.
const GB_CONTENT_TYPE = /^(application\/json|text\/html|text\/plain)/;

async function gamebananaJson(url) {
  if (util.rawRequest === undefined) { //older Vortex builds: no worse than before
    return util.jsonRequest(url);
  }
  const raw = await util.rawRequest(url, { expectedContentType: GB_CONTENT_TYPE, encoding: 'utf-8' });
  return JSON.parse(String(raw));
}

//Full submission record: files, version, name and the game it belongs to (null when unreachable)
async function fetchItemProfile(ref) {
  try {
    return await gamebananaJson(`${API_BASE}/${ref.model}/${ref.itemId}/ProfilePage`);
  } catch (err) {
    log('debug', `GameBanana profile lookup failed for ${itemKey(ref)}: ${err}`);
    return null;
  }
}

//Files only - the lighter endpoint, and the fallback when ProfilePage is unavailable
async function fetchItemFiles(ref) {
  try {
    const data = await gamebananaJson(`${API_BASE}/${ref.model}/${ref.itemId}/DownloadPage`);
    return data?._aFiles || [];
  } catch (err) {
    log('debug', `GameBanana file lookup failed for ${itemKey(ref)}: ${err}`);
    return [];
  }
}

//Version from the newest update title, for submissions that leave _sVersion empty
async function fetchUpdateVersion(config, ref) {
  try {
    const data = await gamebananaJson(`${API_BASE}/${ref.model}/${ref.itemId}/Updates?_nPage=1&_nPerpage=1`);
    const title = data?._aRecords?.[0]?._sName || '';
    const matched = title.match(config.versionPattern || DEFAULT_VERSION_PATTERN);
    return matched ? matched[1] : null;
  } catch (err) {
    log('debug', `GameBanana update lookup failed for ${itemKey(ref)}: ${err}`);
    return null;
  }
}

function newestFile(files) {
  const usable = (files || []).filter(file => file?._idRow);
  if (usable.length === 0) {
    return null;
  }
  return usable.slice().sort((a, b) => (b._tsDateAdded || 0) - (a._tsDateAdded || 0))[0];
}

//The file a reference points at: the one it names, else the submission's newest
function pickFile(files, ref) {
  if (ref.fileId !== undefined) {
    const byId = (files || []).find(file => String(file?._idRow) === String(ref.fileId));
    if (byId !== undefined) {
      return byId;
    }
  }
  if (ref.fileName !== undefined) {
    const byName = (files || []).find(file =>
      String(file?._sFile || '').toLowerCase() === String(ref.fileName).toLowerCase());
    if (byName !== undefined) {
      return byName;
    }
  }
  return newestFile(files);
}

//A date-stamped version for a submission that publishes neither a version nor an update title
function fileDateVersion(file) {
  const seconds = Number(file?._tsDateAdded);
  if (!Number.isFinite(seconds) || (seconds <= 0)) {
    return null;
  }
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}

//Resolve a submission's current file, version and page URL (null when unreachable).
//ref is { model, itemId, fileId?, fileName? }; fileId/fileName select a specific file.
async function resolveGameBananaItem(config, ref) {
  const profile = await fetchItemProfile(ref);
  const files = (profile?._aFiles?.length > 0) ? profile._aFiles : await fetchItemFiles(ref);
  const file = pickFile(files, ref);
  if (file === null) {
    return null;
  }
  let version = profile?._sVersion || null;
  if (!version && (profile === null || profile._nUpdatesCount > 0)) {
    version = await fetchUpdateVersion(config, ref);
  }
  return {
    model: ref.model,
    itemId: String(ref.itemId),
    name: profile?._sName || null,
    version: version || fileDateVersion(file) || String(file._idRow),
    fileId: String(file._idRow),
    fileName: file._sFile || null,
    downloadUrl: file._sDownloadUrl || fileDownloadUrl(file._idRow),
    pageUrl: profile?._sProfileUrl || itemPageUrl(ref),
    gbGameId: profile?._aGame?._idRow,
    isObsolete: !!profile?._bIsObsolete,
  };
}

//The CDN URL a /dl/{fileId} link redirects to - files.gamebanana.com/{section}/{fileName}. Vortex
//names an archive from the server's Content-Disposition, failing that from the last path segment of
//the URL it was given, and only failing both from the fileName it was handed. /dl/{fileId} puts an
//opaque id in that segment and its CDN sends no Content-Disposition, so the id becomes the archive
//name and, through it, the mod's staging folder name. The redirect target carries the real name.
//HEAD, so the archive is never pulled just to learn it, and the redirect has to be FOLLOWED:
//redirect: 'manual' yields an opaque filtered response in Chromium with Location unreadable.
async function resolveCdnUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      throw new Error(`Request failed with status code ${response.status}`);
    }
    return response.url || null;
  } catch (err) {
    log('debug', `Could not resolve the GameBanana CDN URL for ${url}: ${err}`);
    return null;
  }
}

// --- identifying a claimed download ---------------------------------------

//Whether a submission's files include the file the download delivered
function filesContain(files, partial) {
  return (files || []).some(file =>
    ((partial.fileId !== undefined) && (String(file?._idRow) === String(partial.fileId)))
    || ((partial.fileName !== undefined)
      && (String(file?._sFile || '').toLowerCase() === String(partial.fileName).toLowerCase())));
}

//Work out which submission a claimed download came from. The URL alone cannot say, so the
//submissions the user visited on the page are checked newest-first for the file. When none
//confirms it - the user navigated on before the download finished, or the submission's files
//changed - the most recently visited one is used, since that is where the click came from.
async function identifyClaimedItem(config, adapterState, partial) {
  if ((partial.model !== undefined) && (partial.itemId !== undefined)) {
    return { model: partial.model, itemId: partial.itemId, fileId: partial.fileId, fileName: partial.fileName };
  }
  const candidates = visitedCandidates(adapterState)
    .filter(entry => (partial.model === undefined) || (entry.model === partial.model));
  for (const candidate of candidates) {
    const files = await fetchItemFiles(candidate);
    if (filesContain(files, partial)) {
      return { model: candidate.model, itemId: candidate.itemId, fileId: partial.fileId, fileName: partial.fileName };
    }
  }
  const fallback = candidates[0];
  if (fallback === undefined) {
    return null;
  }
  log('warn', `Could not confirm which GameBanana submission file ${partial.fileId || partial.fileName} belongs to - assuming ${itemKey(fallback)}`);
  return { model: fallback.model, itemId: fallback.itemId, fileId: partial.fileId, fileName: partial.fileName };
}

//Recognise a finished download as a GameBanana file (returns null when it is anything else)
function downloadPartialRef(download) {
  for (const url of (download.urls || [])) {
    const partial = parseDownloadRef(url);
    if (partial !== null) {
      return (partial.fileName === undefined)
        ? { ...partial, fileName: download.localPath || undefined }
        : partial;
    }
  }
  const fromGameBanana = (download.urls || []).some(url => {
    try {
      return new URL(url).hostname.toLowerCase().endsWith('gamebanana.com');
    } catch {
      return false;
    }
  });
  return fromGameBanana ? { fileName: download.localPath || undefined } : null;
}

// --- update comparison ----------------------------------------------------

//Whether the submission's newest file is newer than the installed one. File ids grow
//monotonically, which is the only ordering GameBanana offers - versions are free text.
function isNewerFile(latestFileId, installedFileId, latestVersion, installedVersion) {
  const latest = Number(latestFileId);
  const installed = Number(installedFileId);
  if (Number.isFinite(latest) && Number.isFinite(installed) && (installed > 0)) {
    return latest > installed;
  }
  if (!latestVersion || !installedVersion) { //installed before file ids were tracked
    return false;
  }
  return String(latestVersion) !== String(installedVersion);
}

// --- the adapter ----------------------------------------------------------

const adapter = {
  id: 'gamebanana',
  label: 'GameBanana',
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: 'search',
    mdi: DEFAULT_MDI,
    pageTitle: 'Browse Mods',
    homeTooltip: 'Back to the game page',
    adSelectors: DEFAULT_AD_SELECTORS,
    blockedHosts: DEFAULT_BLOCKED_HOSTS,
  },
  //_aRequirements is structured ([[label, url], ...]) but sparse, unversioned, and its URL may point
  //off-site, so it is a best-effort requirement list rather than a resolvable graph
  dependencies: false,
  unresolvedMessage: 'The GameBanana API is unreachable or the submission has no files',

  homeUrl,
  refKey: itemKey,
  parseKey: parseItemKey,
  requirementKey: (requirement) => `${requirement.gbItemType}-${requirement.gbItemId}`,
  parseClaim: downloadPartialRef,
  identify: identifyClaimedItem,
  resolve: resolveGameBananaItem,

  //Same lookup, then the download URL is upgraded to the CDN one it redirects to, so the archive is
  //saved under its real name instead of the file id. Only the install path pays that extra request;
  //the update check and the dependency walk go through resolve(). parseClaim already recognises a
  //CDN URL - it is the same shape a download captured from the site carries.
  resolveForInstall: async (config, ref) => {
    const resolved = await resolveGameBananaItem(config, ref);
    if (resolved === null) {
      return null;
    }
    const cdnUrl = await resolveCdnUrl(resolved.downloadUrl);
    return (cdnUrl !== null) ? { ...resolved, downloadUrl: cdnUrl } : resolved;
  },

  //Submissions carry a human title, so the mod list shows that rather than "Mod-428520"
  displayName: (resolved, key) => resolved.name || key,

  //gamebanana.com/dl/{fileId} carries no file name and the file CDN it redirects to sends no
  //Content-Disposition, so without this the archive is saved under a name with no extension at all
  archiveName: (resolved) => resolved.fileName || undefined,

  //The installed file id rides along with the standard attributes, under the same name
  //gamebanana_downloader.js uses, so a requirement installed by either route is recognised by both
  extraAttributes: (config, resolved) => [[fileIdAttribute(config), Number(resolved.fileId)]],

  //A 1-click link that names its submission installs directly; any other download URL is handed
  //to the capture chain. Every submission page the user opens is remembered, because that ring
  //is the only thing a claimed download can be matched against.
  routeUrl: (ctx, url, navigated) => {
    const download = parseDownloadRef(url);
    if (download !== null) {
      if ((download.model !== undefined) && (download.itemId !== undefined)) {
        ctx.install(download); //a 1-click link naming its submission needs no page context
      } else {
        ctx.requestDownload(url, navigated);
      }
      return true;
    }
    const item = parseItemRef(url);
    if (item !== null) { //remember it: a claimed download is matched against these
      noteVisitedItem(ctx.adapterState, item);
    }
    return false; //not consumed - the base decides whether the view may stay on this URL
  },

  //Updates are compared on file id, which is the only ordering GameBanana offers
  installedInfo: (config, mod, attrs) => ({
    fileId: mod?.attributes?.[fileIdAttribute(config)],
    version: mod?.attributes?.[attrs.version] || mod?.attributes?.version,
  }),
  compareInstalled: (candidate, known) => Number(candidate.fileId) > Number(known.fileId),
  isUpdate: (resolved, installed) =>
    isNewerFile(resolved.fileId, installed.fileId, resolved.version, installed.version),
  updateRef: (parsed, resolved) => ({ ...parsed, fileId: resolved.fileId }),
};

const browser = createBrowserModule(adapter);

module.exports = {
  registerGameBananaBrowser: browser.registerBrowser,
  onceGameBananaBrowser: browser.onceBrowser,
  makeGameBananaBrowsePage: browser.makeBrowsePage,
  installGameBananaItem: browser.installItem,
  resolveGameBananaItem,
  isGameBananaItemInstalled: browser.isItemInstalled,
  checkGameBananaModUpdates: browser.checkModUpdates,
};
