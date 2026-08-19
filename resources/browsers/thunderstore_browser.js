'use strict';

// Shared Thunderstore browser page for Vortex game extensions.
//
// Registers a sidebar page that embeds the live thunderstore.io community site
// inside Vortex. The user browses the real site - search, categories, mod pages,
// screenshots - and a click on a download link becomes a managed Vortex install:
// the archive is claimed, the mod is enabled, its package and version are stamped
// as attributes, and its Thunderstore dependencies are offered for installation.
//
// The page, the claim, the install driver, the dependency prompt and the update
// check all live in base_browser.js. This file is the Thunderstore adapter: the
// URL shapes, the API calls, and the key format. An adopting extension carries
// BOTH files, because this one requires the base from beside it.
//
// What Thunderstore does differently from the other sources:
//
//   1. A package is identified by "Namespace-Name", and both are [a-zA-Z0-9_],
//      so the first hyphen splits the key.
//   2. Versions are semver, so the base's default update comparison applies.
//   3. Packages declare dependencies, so an install offers to bring them along.
//   4. Download URLs are predictable, so a reference that names its version needs
//      no API call before it can be installed.
//
// All game-specific knowledge arrives in one config object, so a second game
// adopts the module by copying both files and writing a config. Every adopter
// carries byte-identical copies of the canonical files in resources/browsers/.
//
// Config:
//   tsCommunity          (required) community slug - sets the home URL
//   requirements         the adopter's requirement table, for dependency routing
//   installRequirement   (api, gameSpec, requirement) => Promise, adopter-injected
//   packageAttribute     mod attribute holding "Namespace-Name" (default thunderstorePackage)
//   versionAttribute     mod attribute holding the installed version (default thunderstoreVersion)
//   allowedHosts         hosts the embedded view may navigate to
//   confirmExternal      show the external-content confirmation before first load (default true)
//   pageId / pageTitle / hotkey / icon / mdi / priority / pageGroup   page identity
//
// Public API: registerThunderstoreBrowser, onceThunderstoreBrowser,
// makeThunderstoreBrowsePage, installThunderstorePackage,
// resolveThunderstorePackage, isThunderstorePackageInstalled,
// checkThunderstoreModUpdates.

const { log, util } = require('vortex-api');
const { createBrowserModule } = require('./base_browser');

const API_BASE = 'https://thunderstore.io';

// Mod attributes. Dedicated attributes rather than the standard 'version' one because
// Vortex's md5 meta lookup can overwrite 'version' with data from an unrelated Nexus match.
const DEFAULT_PACKAGE_ATTRIBUTE = 'thunderstorePackage';
const DEFAULT_VERSION_ATTRIBUTE = 'thunderstoreVersion';

// Hosts the embedded view stays on. gcdn is where package downloads redirect to.
const DEFAULT_ALLOWED_HOSTS = ['thunderstore.io', 'gcdn.thunderstore.io'];

// Sidebar icon: Thunderstore's own bolt mark, taken from the brand SVG
// (thunderstore-io/Thunderstore, django/static/ts-logo-horizontal.svg) and scaled from its
// 504x76 viewBox to the 24x24 one Vortex icons use. Two subpaths, no fill-rule dependency.
const DEFAULT_MDI = 'M0.43 13.16L5.09 21.27 7.24 16.81 4.89 12.71C4.63 12.26 4.63 11.74 4.89 11.28L7.83 6.18C8.09 5.72 8.54 5.46 9.06 5.46H10.64L7.58 12.34H11.36L6.22 22.3 16.54 9.94H13.37L15.54 5.46H19.33 21.53L23.89 1.36H17.14 12.64 7.22C6.37 1.36 5.63 1.78 5.21 2.52L0.43 10.84C0 11.58 0 12.43 0.43 13.16ZM7.57 22.64H16.78C17.63 22.64 18.37 22.22 18.79 21.48L23.58 13.16C24 12.43 24 11.58 23.58 10.84L21.66 7.51H16.94L19.11 11.28C19.37 11.74 19.37 12.26 19.11 12.71L16.18 17.82C15.91 18.28 15.46 18.54 14.94 18.54H12.8L11.32 18.52 7.57 22.64Z';

// --- URLs and keys --------------------------------------------------------

//Community landing page - what the embedded view opens on, and what Home returns to
function homeUrl(config) {
  return `${API_BASE}/c/${config.tsCommunity}/`;
}

//Package page for a reference, used as the mod's "Source" link
function packagePageUrl(config, ref) {
  return config.tsCommunity
    ? `${API_BASE}/c/${config.tsCommunity}/p/${ref.namespace}/${ref.name}/`
    : `${API_BASE}/package/${ref.namespace}/${ref.name}/`;
}

//Direct download for a specific version - predictable, no API call needed
function packageDownloadUrl(ref) {
  return `${API_BASE}/package/download/${ref.namespace}/${ref.name}/${ref.version}/`;
}

//"Namespace-Name" - the key everything in this module is tracked by
function packageKey(ref) {
  return `${ref.namespace}-${ref.name}`;
}

//Thunderstore namespaces and package names are [a-zA-Z0-9_] only, so the first hyphen splits them
function parsePackageKey(key) {
  const idx = String(key || '').indexOf('-');
  if (idx <= 0) {
    return null;
  }
  return { namespace: key.slice(0, idx), name: key.slice(idx + 1) };
}

// --- package reference parsing --------------------------------------------

// thunderstore.io/package/download/{namespace}/{name}/{version}/ - what a "Manual Download" click hits
const DOWNLOAD_URL_RE = /thunderstore\.io\/package\/download\/([^/?#]+)\/([^/?#]+)\/([^/?#]+)/i;
// the CDN zip the download URL redirects to
const CDN_URL_RE = /gcdn\.thunderstore\.io\/[^?#]*\/([^/?#]+)-([^/?#]+)-(\d[^/?#]*)\.zip/i;
// the "Install with Mod Manager" button's protocol link
const ROR2MM_URL_RE = /^ror2mm:\/\/v1\/install\/[^/]+\/([^/]+)\/([^/]+)\/([^/]+)/i;
// Namespace-Name-Version.zip, the archive name Thunderstore always serves
const ARCHIVE_NAME_RE = /^([^-]+)-([^-]+)-(\d[^-]*)\.zip$/i;

//Parse a package reference out of a URL (returns null when it is not a Thunderstore package URL)
function parsePackageRef(url) {
  const input = String(url || '');
  const matched = DOWNLOAD_URL_RE.exec(input)
    || CDN_URL_RE.exec(input)
    || ROR2MM_URL_RE.exec(input);
  if (!matched) {
    return null;
  }
  return { namespace: matched[1], name: matched[2], version: matched[3].replace(/\/$/, '') };
}

//Parse a package reference out of an archive file name
function parseArchiveRef(fileName) {
  const matched = ARCHIVE_NAME_RE.exec(String(fileName || ''));
  if (!matched) {
    return null;
  }
  return { namespace: matched[1], name: matched[2], version: matched[3] };
}

//A dependency, however the API spelled it, as { namespace, name, version }
function parseDependency(entry) {
  if (entry && (typeof entry === 'object')) {
    if (entry.namespace && entry.name) {
      return { namespace: entry.namespace, name: entry.name, version: entry.version_number || entry.version };
    }
    return parseDependency(entry.full_name || entry.package_name);
  }
  const parts = String(entry || '').split('-');
  if (parts.length < 3) {
    return null;
  }
  const version = parts.pop();
  const name = parts.pop();
  return { namespace: parts.join('-'), name, version };
}

function dependencyRefs(dependencies) {
  return (dependencies || []).map(parseDependency).filter(ref => ref !== null);
}

// --- Thunderstore API -----------------------------------------------------

//Resolve a package's current version, download URL and dependencies (null when unreachable)
async function resolveThunderstorePackage(config, namespace, name) {
  if (config.tsCommunity) {
    try {
      const listing = await util.jsonRequest(`${API_BASE}/api/cyberstorm/listing/${config.tsCommunity}/${namespace}/${name}/`);
      if (listing?.latest_version_number) {
        const version = String(listing.latest_version_number);
        return {
          namespace,
          name,
          version,
          downloadUrl: listing.download_url || packageDownloadUrl({ namespace, name, version }),
          pageUrl: packagePageUrl(config, { namespace, name }),
          dependencies: dependencyRefs(listing.dependencies),
          isDeprecated: !!listing.is_deprecated,
        };
      }
    } catch (err) { //not listed in this community - the community-independent endpoint still works
      log('debug', `Thunderstore listing lookup failed for ${namespace}/${name}: ${err}`);
    }
  }
  try {
    const data = await util.jsonRequest(`${API_BASE}/api/experimental/package/${namespace}/${name}/`);
    const latest = data?.latest;
    if (latest?.version_number) {
      const version = String(latest.version_number);
      return {
        namespace,
        name,
        version,
        downloadUrl: latest.download_url || packageDownloadUrl({ namespace, name, version }),
        pageUrl: packagePageUrl(config, { namespace, name }),
        dependencies: dependencyRefs(latest.dependencies),
        isDeprecated: !!data.is_deprecated,
      };
    }
  } catch (err) {
    log('warn', `Could not resolve Thunderstore package ${namespace}/${name}: ${err}`);
  }
  return null;
}

//Recognise a finished download as a Thunderstore package (returns null when it is anything else)
function downloadPackageRef(download) {
  for (const url of (download.urls || [])) {
    const ref = parsePackageRef(url);
    if (ref !== null) {
      return ref;
    }
  }
  const fromThunderstore = (download.urls || []).some(url => {
    try {
      return new URL(url).hostname.toLowerCase().endsWith('thunderstore.io');
    } catch {
      return false;
    }
  });
  return fromThunderstore ? parseArchiveRef(download.localPath) : null;
}

// --- the adapter ----------------------------------------------------------

const adapter = {
  id: 'thunderstore',
  label: 'Thunderstore',
  defaults: {
    packageAttribute: DEFAULT_PACKAGE_ATTRIBUTE,
    versionAttribute: DEFAULT_VERSION_ATTRIBUTE,
    allowedHosts: DEFAULT_ALLOWED_HOSTS,
    icon: 'flash',
    mdi: DEFAULT_MDI,
    pageTitle: 'Browse Mods',
    homeTooltip: 'Back to the community page',
  },
  dependencies: true, //packages declare what they need, so an install offers to bring it along
  unresolvedMessage: 'The Thunderstore API is unreachable and no version was given',

  homeUrl,
  refKey: packageKey,
  parseKey: parsePackageKey,
  requirementKey: (requirement) => `${requirement.tsNamespace}-${requirement.tsName}`,
  parseClaim: downloadPackageRef,

  resolve: (config, ref) => resolveThunderstorePackage(config, ref.namespace, ref.name),

  //A reference that names its version already names its download URL, so the install path
  //never needs the API for it. The dependency walk and the update check use resolve() instead.
  resolveForInstall: (config, ref) => ((ref.version !== undefined) && (ref.version !== null))
    ? Promise.resolve({
      namespace: ref.namespace,
      name: ref.name,
      version: ref.version,
      downloadUrl: packageDownloadUrl(ref),
      pageUrl: packagePageUrl(config, ref),
    })
    : resolveThunderstorePackage(config, ref.namespace, ref.name),

  //The "Install with Mod Manager" link installs directly; a download URL is handed to the
  //capture chain rather than being pushed into the page's history
  routeUrl: (ctx, url, navigated) => {
    if (ROR2MM_URL_RE.test(url)) {
      const ref = parsePackageRef(url);
      if (ref !== null) {
        ctx.install(ref);
        return true;
      }
    }
    if (DOWNLOAD_URL_RE.test(url) || CDN_URL_RE.test(url)) {
      ctx.requestDownload(url, navigated);
      return true;
    }
    return false;
  },
};

const browser = createBrowserModule(adapter);

module.exports = {
  registerThunderstoreBrowser: browser.registerBrowser,
  onceThunderstoreBrowser: browser.onceBrowser,
  makeThunderstoreBrowsePage: browser.makeBrowsePage,
  installThunderstorePackage: browser.installItem,
  resolveThunderstorePackage,
  isThunderstorePackageInstalled: browser.isItemInstalled,
  checkThunderstoreModUpdates: browser.checkModUpdates,
};
