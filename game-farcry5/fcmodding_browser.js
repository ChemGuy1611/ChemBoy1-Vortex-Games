'use strict';

// Shared fcmodding.com browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live downloads.fcmodding.com section for one Far
// Cry game inside Vortex. The user browses the real catalog - mod pages, screenshots,
// changelogs - and a click on a download link becomes a managed Vortex install: the archive
// is claimed, the mod is enabled, and its file name and version are stamped as attributes.
//
// The page, the claim, the install driver and the update check all live in base_browser.js.
// This file is the fcmodding adapter: the URL shapes, the catalog scan, and the key format.
// An adopting extension carries BOTH files, because this one requires the base from beside it.
//
// What fcmodding does differently from the API-backed sources:
//
//   1. There is no API at all. The catalog is a handful of static pages, so a mod's title,
//      version and page URL are read out of the section index and the mod page itself. The
//      pages are small and the catalog is tiny (one to three mods per game), so the scan is
//      one fetch plus one per mod page, cached for the rest of the session.
//   2. A mod is identified by its download's file name, because that is the only identity the
//      host publishes - there is no numeric mod id anywhere on the site.
//   3. Versions come from the redirect target's file name: /files/{name} 302s to
//      /version/{stem}_{version}.{ext}. Files whose target carries no version fall back to
//      the "<i>v1.68</i>" line the mod page prints.
//   4. Versions are not semver. Mod packs use "4.52"-style numbers and the Mod Installer uses
//      a "20250412-1300" build stamp, so comparison is a numeric segment compare, which orders
//      both shapes correctly where semver coercion orders neither (it reads 1.68 as 1.68.0
//      against 1.7 as 1.7.0, and drops the time half of a build stamp entirely).
//   5. Some /files/ aliases are opaque ids that redirect off-host, usually to a Google Drive
//      folder. Those are deliberately not claimed: the file name has no archive extension, so
//      parseDownloadRef refuses it, and the navigation ends up in the system browser instead.
//
// All game-specific knowledge arrives in one config object, so a second game adopts the module
// by copying both files and writing a config. Every adopter carries byte-identical copies of
// the canonical files in resources/browsers/.
//
// Config:
//   fcGame                (required) section slug - sets the home URL, e.g. 'fc5'
//   requirements          the adopter's requirement table (fcmodding_downloader.js shape)
//   installRequirement    (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute      mod attribute holding the file name (default fcmoddingFile)
//   versionAttribute      mod attribute holding the installed version (default fcmoddingVersion,
//                         shared with fcmodding_downloader.js so either route recognises the other)
//   allowedHosts          hosts the embedded view may navigate to
//   confirmExternal       show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// Public API: registerFcModdingBrowser, onceFcModdingBrowser, makeFcModdingBrowsePage,
// installFcModdingFile, resolveFcModdingFile, isFcModdingFileInstalled,
// checkFcModdingModUpdates.

const { log } = require('vortex-api');
const { createBrowserModule } = require('./base_browser');

const SITE_BASE = 'https://downloads.fcmodding.com';
const SITE_HOST = 'downloads.fcmodding.com';

// Mod attributes. A dedicated attribute rather than the standard 'version' one because
// Vortex's md5 meta lookup can overwrite 'version' with data from an unrelated Nexus match.
// The version attribute is deliberately the same one fcmodding_downloader.js tracks, so the
// Mod Installer stays recognised whichever route installed it.
const DEFAULT_PACKAGE_ATTRIBUTE = 'fcmoddingFile';
const DEFAULT_VERSION_ATTRIBUTE = 'fcmoddingVersion';

// Hosts the embedded view stays on: the download host and the project site its assets and
// header links point at. drive.google.com is deliberately absent - see note 5 above.
const DEFAULT_ALLOWED_HOSTS = [SITE_HOST, 'fcmodding.com'];

// Sidebar icon: mdi's pine-tree. The site's own mark is antlers over three pine trees above a
// wordmark, and only the trees survive as a single-colour 24x24 glyph - the vendor's traced
// SVG is a 649-path potrace in which the antlers are fused to the background texture.
const DEFAULT_MDI = 'M10,21V18H3L8,13H5L10,8H7L12,3L17,8H14L19,13H16L21,18H14V21H10Z';

// Sections searched for a file that is not in the game's own, in this order: the shared Mod
// Installer section, then the tools.
const SHARED_SECTIONS = ['all', 'others'];

// --- config helpers -------------------------------------------------------

//Game section - what the embedded view opens on, and what Home returns to
function homeUrl(config) {
  return `${SITE_BASE}/${config.fcGame}/`;
}

//The download's file name, which is the whole key - the host publishes no mod id
function fileKey(ref) {
  return String(ref.fileName);
}

//The inverse. An archive file name, and nothing else: the opaque /files/ ids that redirect
//off-host carry no extension and must never be treated as this source's.
const FILE_KEY_RE = /^[A-Za-z0-9._-]+\.(?:zip|rar|7z)$/i;

function parseFileKey(key) {
  const name = String(key || '');
  return FILE_KEY_RE.test(name) ? { fileName: name } : null;
}

// --- URL parsing ----------------------------------------------------------

// The permanent alias every download link on the site points at - it 302s to the current build
const FILES_URL_RE = /downloads\.fcmodding\.com\/files\/([^/?#]+)/i;
// The redirect target, whose file name carries the version when there is one
const VERSION_URL_RE = /downloads\.fcmodding\.com\/version\/([^/?#]+)/i;
// A versioned target file name: stem, version, extension. The version half is either a build
// stamp (20250412-1300) or a dotted number (1.68); a trailing "_FC6" is neither, which is what
// keeps CustomRadioStationCCR_FC6.zip from being read as version "FC6".
const VERSIONED_NAME_RE = /^(.+)_(\d{8}-\d{4}|\d+(?:\.\d+)*)(\.[A-Za-z0-9]+)$/;

//A versioned target file name -> the alias it came from, plus the version it carries
function aliasFromVersionedName(name) {
  const matched = VERSIONED_NAME_RE.exec(name);
  return (matched !== null)
    ? { fileName: `${matched[1]}${matched[3]}`, version: matched[2] }
    : { fileName: name, version: null };
}

//Parse what a download URL reveals. Returns null for anything that is not one of this host's
//archive downloads, including the opaque ids that redirect to Google Drive.
function parseDownloadRef(url) {
  const input = String(url || '');
  const versioned = VERSION_URL_RE.exec(input);
  if (versioned !== null) {
    const parsed = aliasFromVersionedName(decodeURIComponent(versioned[1]));
    return FILE_KEY_RE.test(parsed.fileName) ? parsed : null;
  }
  const alias = FILES_URL_RE.exec(input);
  if (alias !== null) {
    const fileName = decodeURIComponent(alias[1]);
    return FILE_KEY_RE.test(fileName) ? { fileName, version: null } : null;
  }
  return null;
}

//The permanent alias for a file name
function filesUrl(fileName) {
  return `${SITE_BASE}/files/${fileName}`;
}

// --- the catalog ----------------------------------------------------------

// The site has no API, so the catalog is read from its own pages. Cached per section for the
// rest of the session: the pages are static, small, and the whole catalog is under twenty
// entries. Keyed by section slug, and the value is the promise, so two concurrent lookups of
// the same section share one scan.
const sectionCache = new Map();

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
  return response.text();
}

//Mod page URLs listed by a section index, e.g. /fc5/ -> /fc5/resistance-mod/
function modPageUrls(section, html) {
  const pattern = new RegExp(`https://downloads\\.fcmodding\\.com/${section}/[a-z0-9-]+/`, 'gi');
  return Array.from(new Set(html.match(pattern) || []));
}

// Mod pages carry no heading element - the mod's name is only in the document title, prefixed
// with the site's own name ("Far Cry Modding - Libertad mod"), which is dropped here so the mod
// list shows the mod rather than the site.
const TITLE_PREFIX_RE = /^Far Cry Modding\s*[-|]\s*/i;

//What one mod page publishes: its title, its printed version, and the files it offers
function parseModPage(pageUrl, html) {
  const title = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html) || /<title>([^<]+)<\/title>/i.exec(html);
  const version = /<i>\s*v([^<\s]+)\s*<\/i>/i.exec(html);
  const files = [];
  const pattern = /downloads\.fcmodding\.com\/files\/([^"'?#]+)/gi;
  let matched = pattern.exec(html);
  while (matched !== null) {
    const fileName = decodeURIComponent(matched[1]);
    if (FILE_KEY_RE.test(fileName)) {
      files.push(fileName);
    }
    matched = pattern.exec(html);
  }
  return {
    pageUrl,
    title: title ? title[1].trim().replace(TITLE_PREFIX_RE, '') : null,
    version: version ? version[1] : null,
    files,
  };
}

//Every file one section publishes, as fileName -> { pageUrl, title, version }
async function scanSection(section) {
  const entries = new Map();
  const index = await fetchText(`${SITE_BASE}/${section}/`);
  for (const pageUrl of modPageUrls(section, index)) {
    try {
      const page = parseModPage(pageUrl, await fetchText(pageUrl));
      for (const fileName of page.files) {
        if (!entries.has(fileName)) { //first page to offer a file owns it
          entries.set(fileName, { pageUrl, title: page.title, version: page.version });
        }
      }
    } catch (err) {
      log('debug', `Could not read fcmodding mod page ${pageUrl}: ${err}`);
    }
  }
  return entries;
}

function sectionEntries(section) {
  if (!sectionCache.has(section)) {
    sectionCache.set(section, scanSection(section).catch((err) => {
      log('warn', `Could not read the fcmodding ${section} section: ${err}`);
      sectionCache.delete(section); //a failed scan must not be cached as an empty catalog
      return new Map();
    }));
  }
  return sectionCache.get(section);
}

//Find which mod page a file belongs to, searching the game's own section first
async function lookupCatalog(config, fileName) {
  for (const section of [config.fcGame, ...SHARED_SECTIONS]) {
    const entries = await sectionEntries(section);
    const entry = entries.get(fileName);
    if (entry !== undefined) {
      return entry;
    }
  }
  return null;
}

// --- resolving ------------------------------------------------------------

//The current build behind an alias. Reads the final URL after a FOLLOWED redirect: a manual
//redirect returns an opaque filtered response in Chromium - status 0, headers emptied - so the
//Location header cannot be read at all. HEAD keeps this off the wire for archives that run to
//hundreds of megabytes.
async function resolveDownloadUrl(fileName) {
  try {
    const response = await fetch(filesUrl(fileName), { method: 'HEAD' });
    return response.url || null;
  } catch (err) {
    log('debug', `Could not resolve the fcmodding download for ${fileName}: ${err}`);
    return null;
  }
}

//Resolve a file's current version, download URL and page (null when it is not this host's to
//serve - an alias that redirects to Google Drive resolves to a URL Vortex cannot install from)
async function resolveFcModdingFile(config, ref) {
  const fileName = String(ref.fileName);
  const entry = await lookupCatalog(config, fileName);
  const resolvedUrl = await resolveDownloadUrl(fileName);
  if ((resolvedUrl !== null) && !resolvedUrl.includes(SITE_HOST)) {
    log('info', `fcmodding file ${fileName} redirects off-host to ${resolvedUrl} - not installable from here`);
    return null;
  }
  const fromUrl = (resolvedUrl !== null)
    ? aliasFromVersionedName(decodeURIComponent(resolvedUrl.split('/').pop()))
    : { version: null };
  const version = ref.version || fromUrl.version || entry?.version || null;
  return {
    fileName,
    name: entry?.title || fileName,
    version: (version !== null) ? String(version) : '',
    //the versioned target rather than the alias, so two builds of the same mod do not collide
    //in the download folder under one name
    downloadUrl: resolvedUrl || filesUrl(fileName),
    pageUrl: entry?.pageUrl || homeUrl(config),
  };
}

//Recognise a finished download as an fcmodding one (returns null when it is anything else)
function downloadRef(download) {
  for (const url of (download.urls || [])) {
    const ref = parseDownloadRef(url);
    if (ref !== null) {
      return ref;
    }
  }
  return null;
}

// --- version comparison ---------------------------------------------------

//Versions here are either a dotted number (4.52) or a build stamp (20250412-1300). Comparing
//them segment by segment as numbers orders both: 4.52 above 4.9 because 52 > 9, and two builds
//from the same day by their time half, which semver coercion drops.
function versionSegments(version) {
  return (String(version || '').match(/\d+/g) || []).map(Number);
}

function compareVersions(left, right) {
  const a = versionSegments(left);
  const b = versionSegments(right);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) {
      return (diff > 0) ? 1 : -1;
    }
  }
  return 0;
}

//An unknown installed version cannot be compared, so it is not reported as out of date - the
//mod self-heals on its next install, which stamps the attribute.
function isNewerBuild(latest, installed) {
  if (!latest || !installed) {
    return false;
  }
  return compareVersions(latest, installed) > 0;
}

// --- the adapter ----------------------------------------------------------

const adapter = {
  id: 'fcmodding',
  label: 'fcmodding.com',
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: 'search',
    mdi: DEFAULT_MDI,
    pageTitle: 'Browse Far Cry Mods',
    homeTooltip: 'Back to the game downloads',
  },
  dependencies: false, //the site publishes no dependency data of any kind
  unresolvedMessage: 'downloads.fcmodding.com is unreachable, or this download is hosted elsewhere',

  homeUrl,
  refKey: fileKey,
  parseKey: parseFileKey,
  requirementKey: (requirement) => String(requirement.fileName),
  parseClaim: downloadRef,
  resolve: resolveFcModdingFile,

  //Mod pages carry a human title, so the mod list shows that rather than a bare file name
  displayName: (resolved, key) => resolved.name || key,

  //A download URL is handed to the capture chain rather than followed as a navigation
  routeUrl: (ctx, url, navigated) => {
    if (parseDownloadRef(url) === null) {
      return false;
    }
    ctx.requestDownload(url, navigated);
    return true;
  },

  //Updates compare by numeric segments, which semver coercion cannot do for either shape
  isUpdate: (resolved, installed) => isNewerBuild(resolved.version, installed.version),
  compareInstalled: (candidate, known) => isNewerBuild(candidate.version, known.version),
};

const browser = createBrowserModule(adapter);

module.exports = {
  registerFcModdingBrowser: browser.registerBrowser,
  onceFcModdingBrowser: browser.onceBrowser,
  makeFcModdingBrowsePage: browser.makeBrowsePage,
  installFcModdingFile: browser.installItem,
  resolveFcModdingFile,
  isFcModdingFileInstalled: browser.isItemInstalled,
  checkFcModdingModUpdates: browser.checkModUpdates,
};
