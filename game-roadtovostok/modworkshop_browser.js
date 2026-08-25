'use strict';

// Shared ModWorkshop browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live modworkshop.net game section inside
// Vortex. The user browses the real site - search, categories, mod pages, screenshots -
// and a click on a download link becomes a managed Vortex install: the archive is
// claimed, the mod is enabled, and its mod id, version and file id are stamped as
// attributes. ModWorkshop mods that declare dependencies offer them for installation.
//
// The page, the claim, the install driver, the dependency prompt and the update
// check all live in base_browser.js. This file is the ModWorkshop adapter: the URL
// shapes, the API calls, and the key format. An adopting extension carries BOTH
// files, because this one requires the base from beside it.
//
// What ModWorkshop does differently from Thunderstore and GameBanana:
//
//   1. A mod is identified by one numeric id (no namespace, no model/section split),
//      so the key is just the id and needs no parsing rule at all.
//   2. A download click's URL identifies the mod directly - either the API redirect
//      endpoint (api.modworkshop.net/mods/{id}/download) or the storage CDN URL,
//      whose file name is prefixed "{modId}_{uploaderId}_...". Only the "install with
//      a manager" protocol links (mws-mo2://, mws-manager://) sometimes carry a file
//      id with no mod id, which costs one API call to resolve.
//   3. Mods declare dependencies with the dependency's whole mod record embedded, so
//      offering them costs no extra lookup beyond the one already made to resolve the
//      mod itself.
//   4. Versions are free text - "v"-prefixed, date-based and single-segment values all
//      occur - so update comparison uses the file id, which is a Laravel autoincrement
//      and reliably orders newest-last.
//
// All game-specific knowledge arrives in one config object, so a second game adopts the
// module by copying both files and writing a config. Every adopter carries byte-identical
// copies of the canonical files in resources/browsers/.
//
// Config:
//   mwsGame               (required) game short_name/slug - sets the home URL, e.g. 'roadtovostok'
//   requirements          the adopter's requirement table (modworkshop_downloader.js shape)
//   installRequirement    (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute      mod attribute holding the mod id (default modworkshopMod)
//   versionAttribute      mod attribute holding the installed version (default modworkshopVersion)
//   fileIdAttribute       mod attribute holding the installed file id (default modworkshopFileId,
//                         shared with modworkshop_downloader.js so either route recognises the other)
//   allowedHosts          hosts the embedded view may navigate to
//   hideAds / adSelectors / blockAdPopups / blockedHosts   ad handling, per source defaults below
//   confirmExternal       show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// Public API: registerModWorkshopBrowser, onceModWorkshopBrowser,
// makeModWorkshopBrowsePage, installModWorkshopMod, resolveModWorkshopMod,
// isModWorkshopModInstalled, checkModWorkshopModUpdates.

const { log, util } = require('vortex-api');
const { createBrowserModule } = require('./base_browser');

const SITE_BASE = 'https://modworkshop.net';
const API_BASE = 'https://api.modworkshop.net';

// Mod attributes. Dedicated attributes rather than the standard 'version' one because
// Vortex's md5 meta lookup can overwrite 'version' with data from an unrelated Nexus match.
// The file id attribute is deliberately the same one modworkshop_downloader.js tracks, so a
// requirement installed by either route is recognised by both.
const DEFAULT_PACKAGE_ATTRIBUTE = 'modworkshopMod';
const DEFAULT_VERSION_ATTRIBUTE = 'modworkshopVersion';
const DEFAULT_FILE_ID_ATTRIBUTE = 'modworkshopFileId';

// Hosts the embedded view stays on: the site, and the storage host its downloads redirect to.
const DEFAULT_ALLOWED_HOSTS = ['modworkshop.net', 'storage.modworkshop.net'];

// Ad slots hidden in the embedded view, verified against a live ModWorkshop mod page in August
// 2026: every slot carries the generic ".ad" wrapper class, and the specific ids below are its
// server-rendered containers (#mws-ads-left, #mws-ads-mod-pane, ...). Cosmetic only - the
// requests still happen, this just stops showing the result.
const DEFAULT_AD_SELECTORS = [
  '.ad',
  '#mws-ads-top',
  '#mws-ads-top-mobile',
  '#mws-ads-left',
  '#mws-ads-right',
  '#mws-ads-mod-pane',
];

// Sidebar icon: ModWorkshop's own mark - a hexagonal frame around an isometric cube - traced
// from the site's vector logo at https://modworkshop.net/assets/mws_logo_white.svg (linked from
// the homepage; the file is also reachable as /favicon.ico). Converted from that file's 14x14
// viewBox to the 24x24 one mdi paths use: the layer's translate(-23.375834,-34.820791) applied,
// then scaled by 24/14. Only the logo's monochrome outline path is used - the three coloured
// cube faces are separate paths in the source and have no meaning in a single-colour icon.
const DEFAULT_MDI = 'M12.05,0.64L9.97,1.84L10.4,2.58L4.74,5.85L4.31,5.1L2.23,6.31L2.23,8.71L3.09,8.71L3.09,15.24L2.23,15.24L2.23,17.64L4.31,18.85L4.74,18.1L10.4,21.37L9.97,22.11L12.05,23.31L14.13,22.11L13.7,21.37L19.36,18.1L19.79,18.85L21.87,17.64L21.87,15.24L21.01,15.24L21.01,8.71L21.87,8.71L21.87,6.31L19.79,5.1L19.36,5.85L13.7,2.58L14.13,1.84ZM12.05,1.63L12.24,1.74L12.24,4.65L18.3,8.15L20.82,6.69L21.01,6.8L21.01,7.02L18.49,8.47L18.49,15.48L21.01,16.93L21.01,17.15L20.82,17.26L18.3,15.8L12.24,19.3L12.24,22.21L12.05,22.32L11.86,22.21L11.86,19.3L5.8,15.8L3.28,17.26L3.09,17.15L3.09,16.93L5.61,15.48L5.61,8.47L3.09,7.02L3.09,6.8L3.28,6.69L5.8,8.15L11.86,4.65L11.86,1.74ZM12.05,5.28L6.25,8.63L6.25,15.32L12.05,18.67L17.85,15.32L17.85,8.63ZM11.86,5.76L11.86,7.67L8.41,9.66L6.76,8.7ZM12.24,5.76L17.34,8.7L15.69,9.66L12.24,7.67ZM6.57,9.03L8.22,9.99L8.22,13.96L6.57,14.92ZM17.53,9.03L17.53,14.92L15.88,13.96L15.88,9.99ZM8.41,14.29L11.86,16.28L11.86,18.19L6.76,15.25ZM15.69,14.29L17.34,15.25L12.24,18.19L12.24,16.28Z';

// --- config helpers -------------------------------------------------------

function fileIdAttribute(config) {
  return config.fileIdAttribute || DEFAULT_FILE_ID_ATTRIBUTE;
}

//Game section - what the embedded view opens on, and what Home returns to
function homeUrl(config) {
  return `${SITE_BASE}/g/${config.mwsGame}`;
}

//Mod page for a reference, used as the mod's "Source" link
function modPageUrl(ref) {
  return `${SITE_BASE}/mod/${ref.modId}`;
}

//The mod id, as a string - the whole key, since ModWorkshop has no namespace or model split
function modKey(ref) {
  return String(ref.modId);
}

const MOD_KEY_RE = /^(\d+)$/;

function parseModKey(key) {
  const matched = MOD_KEY_RE.exec(String(key || ''));
  return (matched !== null) ? { modId: matched[1] } : null;
}

// --- URL parsing ----------------------------------------------------------

// storage.modworkshop.net/mods/files/{modId}_{uploaderId}_{hash}.{ext} - what the site's own
// Download button resolves to (verified live: the direct storage URL is embedded in the mod
// page's own server-rendered data, so this is very likely the URL a click actually hits)
const STORAGE_URL_RE = /storage\.modworkshop\.net\/mods\/files\/(\d+)_/i;
// api.modworkshop.net/mods/{id}/download and the /files/latest|primary/download variants -
// all 302 to the storage URL above (modworkshop.net itself has no such path - verified live,
// it 404s - the API host is what a browser click actually reaches)
const API_MOD_DOWNLOAD_RE = /api\.modworkshop\.net\/mods\/(\d+)\/(?:download|files\/(?:latest|primary)\/download)/i;
// api.modworkshop.net/files/{fileId}/download - carries a file id but not the mod it belongs to
const API_FILE_DOWNLOAD_RE = /api\.modworkshop\.net\/files\/(\d+)\/download/i;
// the "Install with Mod Organizer 2" button's protocol link - mod id is in the URL itself
const MO2_URL_RE = /^mws-mo2:\/\/install\/[^/]+\/(\d+)\/(\d+)/i;
// the "Install with MWS Manager" button's protocol link - file id only, no mod id
const MANAGER_URL_RE = /^mws-manager:\/\/mws\/install\/(\d+)/i;

//Parse what a download URL reveals: a mod id when the URL carries one, else a file id
function parseDownloadRef(url) {
  const input = String(url || '');
  const storage = STORAGE_URL_RE.exec(input);
  if (storage !== null) {
    return { modId: storage[1] };
  }
  const apiMod = API_MOD_DOWNLOAD_RE.exec(input);
  if (apiMod !== null) {
    return { modId: apiMod[1] };
  }
  const apiFile = API_FILE_DOWNLOAD_RE.exec(input);
  if (apiFile !== null) {
    return { fileId: apiFile[1] };
  }
  return null;
}

// --- ModWorkshop API -------------------------------------------------------

//The mod record, including its embedded dependencies (null when unreachable or missing)
async function fetchMod(ref) {
  try {
    return await util.jsonRequest(`${API_BASE}/mods/${ref.modId}`);
  } catch (err) {
    log('debug', `ModWorkshop mod lookup failed for ${modKey(ref)}: ${err}`);
    return null;
  }
}

//The file the site's own download button serves - matches the mod's own version in every
//sampled case, and avoids the display_order trap /files/latest falls into (MODWORKSHOP_API.md)
async function fetchPrimaryFile(ref) {
  try {
    return await util.jsonRequest(`${API_BASE}/mods/${ref.modId}/files/primary`);
  } catch (err) { //404 when the mod has no files at all
    log('debug', `ModWorkshop primary file lookup failed for ${modKey(ref)}: ${err}`);
    return null;
  }
}

//A file id -> the mod it belongs to, for the protocol links that only name the file
async function resolveFileOwner(fileId) {
  try {
    const file = await util.jsonRequest(`${API_BASE}/files/${fileId}`);
    return file?.mod_id ? String(file.mod_id) : null;
  } catch (err) {
    log('warn', `Could not resolve which ModWorkshop mod file ${fileId} belongs to: ${err}`);
    return null;
  }
}

//A dependency entry -> a mod reference, or null when it has no ModWorkshop record of its own
//(an "offsite" dependency pointing elsewhere entirely, which nothing here can resolve)
function parseDependency(entry) {
  const dep = entry && entry.mod;
  return dep?.id ? { modId: String(dep.id) } : null;
}

//ModWorkshop marks nearly every sampled dependency "optional" regardless of whether the mod
//actually works without it (BeardLib on Payday 2 is required in practice and still ships
//optional: true), so that flag is not used to filter what is offered here - every embedded
//dependency is offered, same as Thunderstore. The flag matters at a different layer instead:
//the standing requirements check (plan wave W8) treats "optional" as not-a-failure.
function dependencyRefs(dependencies) {
  return (dependencies || []).map(parseDependency).filter(ref => ref !== null);
}

//Resolve a mod's current file, version, page URL and dependencies (null when unreachable,
//unapproved, suspended, or carrying nothing downloadable)
async function resolveModWorkshopMod(config, ref) {
  const mod = await fetchMod(ref);
  if ((mod === null) || !mod.has_download || !mod.approved || mod.suspended) {
    return null;
  }
  const file = await fetchPrimaryFile(ref);
  if (file === null) {
    return null;
  }
  return {
    modId: String(ref.modId),
    name: mod.name || null,
    version: file.version || mod.version || null,
    fileId: String(file.id),
    downloadUrl: file.download_url,
    pageUrl: modPageUrl(ref),
    dependencies: dependencyRefs(mod.dependencies),
    disableModManagers: !!mod.disable_mod_managers,
  };
}

//Recognise a finished download as a ModWorkshop mod (returns null when it is anything else)
function downloadRef(download) {
  for (const url of (download.urls || [])) {
    const ref = parseDownloadRef(url);
    if (ref !== null) {
      return ref;
    }
  }
  return null;
}

// --- identifying a claimed download ---------------------------------------

//A claimed download that only carries a file id needs one lookup to find its mod; one that
//already carries a mod id needs nothing further
async function identifyModWorkshopDownload(config, adapterState, partial) {
  if (partial.modId !== undefined) {
    return { modId: partial.modId };
  }
  if (partial.fileId !== undefined) {
    const modId = await resolveFileOwner(partial.fileId);
    return (modId !== null) ? { modId } : null;
  }
  return null;
}

// --- protocol-link installs ------------------------------------------------

//Install from a manager-protocol link, but only after confirming the mod has not opted out.
//ModWorkshop's own rule is that an integration should "respect the flag rather than offering a
//one-click install anyway" - the site is expected to hide these buttons for such a mod, but a
//probe of a live flagged mod (roadtovostok's own loader, mod 55623) still found the MO2 link
//present in the page's data, so this checks the flag itself rather than trusting the site to.
//The plain Download button is unaffected either way: the flag governs one-click manager
//installs, not a normal file download.
function installIfManagersAllowed(ctx, ref) {
  resolveModWorkshopMod(ctx.config, ref).then((resolved) => {
    if (resolved === null) {
      return;
    }
    if (resolved.disableModManagers) {
      log('info', `ModWorkshop mod ${modKey(ref)} opts out of mod-manager installs - `
        + 'ignoring the manager link (the plain Download button still works)');
      return;
    }
    ctx.install(ref);
  }).catch(err => log('warn', `Failed to resolve ModWorkshop mod ${modKey(ref)} for a manager-link install: ${err}`));
}

// --- update comparison ----------------------------------------------------

//Whether the mod's current file is newer than the installed one. File ids are a Laravel
//autoincrement and were verified newest-last against a real mod's file history
//(MODWORKSHOP_API.md's display_order table) - versions are free text and cannot be trusted alone.
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
  id: 'modworkshop',
  label: 'ModWorkshop',
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: 'plugin',
    mdi: DEFAULT_MDI,
    pageTitle: 'Browse Mods',
    homeTooltip: 'Back to the game page',
    adSelectors: DEFAULT_AD_SELECTORS,
  },
  dependencies: true, //dependency entries embed the dependency's own mod record, at no extra cost
  unresolvedMessage: 'The ModWorkshop API is unreachable, the mod has no files, or it is unapproved/suspended',

  homeUrl,
  refKey: modKey,
  parseKey: parseModKey,
  requirementKey: (requirement) => String(requirement.mwsModId),
  parseClaim: downloadRef,
  identify: identifyModWorkshopDownload,
  resolve: resolveModWorkshopMod,

  //Mods carry a human title, so the mod list shows that rather than a bare id
  displayName: (resolved, key) => resolved.name || key,

  //The installed file id rides along with the standard attributes, under the same name
  //modworkshop_downloader.js uses, so a requirement installed by either route is recognised by both
  extraAttributes: (config, resolved) => [[fileIdAttribute(config), Number(resolved.fileId)]],

  //A download URL is handed to the capture chain. A manager-protocol link installs directly,
  //after the disable_mod_managers check above.
  routeUrl: (ctx, url, navigated) => {
    const download = parseDownloadRef(url);
    if (download !== null) {
      ctx.requestDownload(url, navigated);
      return true;
    }
    const mo2 = MO2_URL_RE.exec(url);
    if (mo2 !== null) {
      installIfManagersAllowed(ctx, { modId: mo2[1] });
      return true;
    }
    const manager = MANAGER_URL_RE.exec(url);
    if (manager !== null) {
      identifyModWorkshopDownload(ctx.config, ctx.adapterState, { fileId: manager[1] })
        .then(ref => ((ref !== null) ? installIfManagersAllowed(ctx, ref) : undefined))
        .catch(err => log('warn', `Failed to resolve ModWorkshop file ${manager[1]}: ${err}`));
      return true;
    }
    return false;
  },

  //Updates are compared on file id, which is the only reliable ordering ModWorkshop offers
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
  registerModWorkshopBrowser: browser.registerBrowser,
  onceModWorkshopBrowser: browser.onceBrowser,
  makeModWorkshopBrowsePage: browser.makeBrowsePage,
  installModWorkshopMod: browser.installItem,
  resolveModWorkshopMod,
  isModWorkshopModInstalled: browser.isItemInstalled,
  checkModWorkshopModUpdates: browser.checkModUpdates,
};
