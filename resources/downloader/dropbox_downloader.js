"use strict";

// Shared Dropbox requirements auto-downloader for Vortex game extensions.
//
// Downloads and installs modding requirements (mod managers, tools, fixes) that their authors
// share as a public Dropbox link. The entry points take an array of requirement objects,
// processed sequentially. Each requirement names one share link; the file behind it is fetched
// by this module, imported into Vortex's download folder under its real name, and installed as
// a managed mod. An "update available" notification is raised when the file behind the link is
// replaced with one carrying a higher version in its name.
//
// Why the module fetches the file itself instead of handing the link to Vortex's download
// manager: a Dropbox share link answers with a chain of 302s (www.dropbox.com ->
// <id>.dl.dropboxusercontent.com/cd/0/get/... or /cd/0/inline/... -> sometimes a relative
// /cd/0/inline2/... hop), and the file name only arrives in the Content-Disposition header of
// the last hop. Links in the legacy /s/<id>/<name> shape end on an inline hop that answers
// `Content-Disposition: attachment; filename=unspecified`. Vortex 2.x names a download after the
// server's Content-Disposition first and only falls back to the caller's file-name hint, so such
// a link lands in the download folder as an extension-less file called "unspecified" that no
// installer can open. Fetching here lets the module pick the name: the server's when it is a
// real one, otherwise the name in the share link's own path.
//
// HTTP goes through Node's https module, not the renderer's fetch: a cross-origin fetch cannot
// read Content-Disposition unless the server exposes it, and Dropbox does not. Redirects are
// followed by hand for the same reason (each hop's headers stay readable), resolving relative
// Location values against the hop that sent them.
//
// Share links are normalized before use: dl=1 is forced (dl=0 serves the HTML preview page) and
// the st= session token is dropped (it is tied to the browser session that copied the link and
// can expire). rlkey= is kept - current-format /scl/fi/ links do not resolve without it.
//
// There is deliberately no version pinning: a share link points at one file and Dropbox keeps
// no history behind it, so there is nothing to pin to.
//
// Installed copies are identified by a mod attribute carrying the normalized share link, or by
// the requirement's mod type when it sets one - the latter also recognizes copies an extension
// installed before it adopted this module.
//
// The only externals are Node built-ins and vortex-api.
//
// Public API: downloadDropbox, checkForDropboxUpdate (array-based entry points),
// downloadDropboxRequirement, checkForDropboxUpdateRequirement (single-requirement variants),
// isDropboxRequirementInstalled, getLatestDropboxFile, normalizeDropboxUrl, compareVersions.

const https = require("https");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { pipeline } = require("stream/promises");
const { actions, log, selectors, util, VortexError } = require("vortex-api");

// Mod attribute carrying the normalized share link - marks a mod as an installed copy.
const SHARE_ATTRIBUTE = "dropboxShareUrl";
// Version in the resolved file name: the first dotted number run, e.g. "ModManager (x64)
// 1.0.0.59.zip" -> 1.0.0.59. A run without a dot ("x64", "2024") is not a version.
const DEFAULT_VERSION_PATTERN = /(\d+(?:\.\d+)+)/;
const MAX_REDIRECTS = 10;
// Socket idle timeout. Applies per hop, and to the body transfer as a stall timeout - a slow
// but moving download is never cut off.
const REQUEST_TIMEOUT_MS = 30000;
// Placeholder name Dropbox sends for legacy-format links.
const UNSPECIFIED_NAME = "unspecified";

// --- share links ----------------------------------------------------------

// Normalized share link: dl forced to the given value, st dropped, everything else kept. Returns
// the input unchanged when it is not a parseable URL, so a bad requirement fails loudly at the
// request instead of here.
function normalizeDropboxUrl(shareUrl, dl = "1") {
  let url;
  try {
    url = new URL(String(shareUrl));
  } catch {
    return String(shareUrl);
  }
  url.searchParams.delete("st");
  url.searchParams.set("dl", dl);
  url.hash = "";
  return url.toString();
}

// Manual-download page: the requirement's own, else the share link's preview page (dl=0).
function pageUrl(requirement) {
  return requirement.pageUrl || normalizeDropboxUrl(requirement.shareUrl, "0");
}

// Concurrency-guard / notification key - unique per share link.
function guardKey(requirement) {
  return `dropbox-${normalizeDropboxUrl(requirement.shareUrl)}`;
}

// File name carried in the share link's path: /s/<id>/<name> and /scl/fi/<id>/<name> both end
// on it. Null when the last segment carries no extension (a folder link, a bare id).
function fileNameFromShareUrl(shareUrl) {
  try {
    const segment = new URL(String(shareUrl)).pathname.split("/").filter(Boolean).pop() ?? "";
    const name = decodeURIComponent(segment);
    return /\.[a-z0-9]+$/i.test(name) ? name : null;
  } catch {
    return null;
  }
}

// File name from a Content-Disposition header. RFC 6266: filename* (percent-encoded UTF-8) wins
// over the plain filename. Null when the header is absent or carries Dropbox's placeholder.
function fileNameFromDisposition(header) {
  if (!header) {
    return null;
  }
  let name = null;
  const star = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      name = decodeURIComponent(star[1].trim());
    } catch {
      name = null;
    }
  }
  if (name === null) {
    const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
    name = plain?.[1]?.trim() ?? null;
  }
  if (!name || name.toLowerCase() === UNSPECIFIED_NAME) {
    return null;
  }
  return name;
}

// Strip characters Windows refuses in a file name, so a server-supplied name can be written.
function safeFileName(name) {
  return path.basename(String(name)).replace(/[<>:"/\\|?*]/g, "_");
}

// --- HTTP -----------------------------------------------------------------

// One request, no redirect handling. Resolves to the response with its body unread.
function requestOnce(url, method) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers: { Accept: "*/*" } }, resolve);
    req.setTimeout(REQUEST_TIMEOUT_MS, () =>
      req.destroy(new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s (${url})`)),
    );
    req.on("error", reject);
    req.end();
  });
}

// Follow the redirect chain from a share link to the file. Resolves to { response, url } for
// the final 200, body unread - a GET caller streams it, a HEAD caller has nothing to read.
// Throws on a non-200 end, an HTML end (removed or private links end on a page, not a file), or
// a chain longer than MAX_REDIRECTS.
async function followRedirects(startUrl, method) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const response = await requestOnce(url, method);
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      response.resume(); //discard the redirect body so the socket is released
      url = new URL(response.headers.location, url).toString();
      continue;
    }
    if (status !== 200) {
      response.resume();
      throw new Error(`Request failed with status code ${status} (${url})`);
    }
    const contentType = String(response.headers["content-type"] ?? "");
    if (contentType.startsWith("text/html")) {
      response.resume();
      throw new Error(
        "Dropbox returned a web page instead of the file - the link was most likely removed, made private, or is a folder link",
      );
    }
    return { response, url };
  }
  throw new Error(`Too many redirects (more than ${MAX_REDIRECTS}) from ${startUrl}`);
}

// --- version handling -----------------------------------------------------

//Numeric segments of a dotted version: "1.0.0.59" -> [1, 0, 0, 59]. Null when it carries no digits.
function versionSegments(version) {
  const segments = String(version ?? "")
    .split(".")
    .map((segment) => segment.replace(/\D/g, ""))
    .filter((segment) => segment !== "")
    .map(Number);
  return segments.length > 0 ? segments : null;
}

//Compare two dotted versions segment by segment (missing segments count as 0).
//Returns a negative number, 0, or a positive number, like a sort comparator; null sorts lowest.
function compareVersions(lhs, rhs) {
  const left = versionSegments(lhs);
  const right = versionSegments(rhs);
  if (left === null || right === null) {
    return (left === null ? 0 : 1) - (right === null ? 0 : 1);
  }
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

//Version embedded in a file name (null if it carries none)
function versionFromFileName(requirement, fileName) {
  if (!fileName) {
    return null;
  }
  const match = String(fileName).match(requirement.versionPattern || DEFAULT_VERSION_PATTERN);
  return match?.[1] ?? null;
}

// --- file resolution ------------------------------------------------------

// The file name to save under: the server's when it sent a real one, otherwise the name in the
// share link's path, otherwise the requirement's fileName.
function chooseFileName(requirement, disposition) {
  const name =
    fileNameFromDisposition(disposition) ??
    fileNameFromShareUrl(requirement.shareUrl) ??
    requirement.fileName;
  if (!name) {
    throw new Error(
      `Dropbox did not name the file behind the ${requirement.userFacingName} link - set fileName on the requirement`,
    );
  }
  return safeFileName(name);
}

// Current file behind the share link as { fileName, version }, read with HEAD requests so no
// body is pulled. Returns null when the link cannot be resolved (offline, removed link).
async function getLatestDropboxFile(requirement) {
  try {
    const { response } = await followRedirects(normalizeDropboxUrl(requirement.shareUrl), "HEAD");
    const fileName = chooseFileName(requirement, response.headers["content-disposition"]);
    const version =
      versionFromFileName(requirement, fileName) ?? requirement.fallbackVersion ?? null;
    return { fileName, version };
  } catch (err) {
    log("warn", `Could not resolve the ${requirement.userFacingName} Dropbox link: ${err}`);
    return null;
  }
}

// Download the file behind the share link into dir. Resolves to { filePath, fileName, version }.
// Written to a .part file and renamed once complete, so a transfer that fails part-way never
// leaves a truncated archive under the real name.
async function fetchDropboxFile(requirement, dir) {
  const { response } = await followRedirects(normalizeDropboxUrl(requirement.shareUrl), "GET");
  let fileName;
  try {
    fileName = chooseFileName(requirement, response.headers["content-disposition"]);
  } catch (err) {
    response.resume();
    throw err;
  }
  const filePath = path.join(dir, fileName);
  const partPath = `${filePath}.part`;
  try {
    await fsp.mkdir(dir, { recursive: true });
    await pipeline(response, fs.createWriteStream(partPath));
    await fsp.rename(partPath, filePath);
  } catch (err) {
    await fsp.rm(partPath, { force: true }).catch(() => null);
    throw err;
  }
  const version = versionFromFileName(requirement, fileName) ?? requirement.fallbackVersion ?? null;
  return { filePath, fileName, version };
}

// --- install / update -----------------------------------------------------

// Requirements with an install currently running - guards against overlapping runs (e.g.
// double-clicking the toolbar download action).
const activeInstalls = new Set();

//Mod ids of the installed copies of this requirement. Captured before an install so the
//previous version can be disabled once the new one lands - an update installs a second mod
//entry rather than replacing the first, and two enabled copies deploy on top of each other.
function requirementModIds(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  const shareUrl = normalizeDropboxUrl(requirement.shareUrl);
  return Object.keys(mods).filter(
    (id) =>
      mods[id]?.attributes?.[SHARE_ATTRIBUTE] === shareUrl ||
      (requirement.modType !== undefined && mods[id]?.type === requirement.modType),
  );
}

//Check if the requirement is installed
function isDropboxRequirementInstalled(api, gameId, requirement) {
  return requirementModIds(api, gameId, requirement).length > 0;
}

//Highest version recorded across the installed copies (null when none carries one)
function installedVersion(api, gameId, requirement) {
  const state = api.getState();
  const mods = state.persistent.mods[gameId] || {};
  return requirementModIds(api, gameId, requirement)
    .map((id) => mods[id]?.attributes?.version)
    .filter((version) => versionSegments(version) !== null)
    .reduce((best, version) => (compareVersions(version, best) > 0 ? version : best), null);
}

// Move a fetched file into the download folder. Resolves to its download id.
function importDownload(api, filePath) {
  return new Promise((resolve, reject) =>
    api.events.emit("import-downloads", [filePath], (dlIds) => {
      const dlId = dlIds?.[0];
      return dlId === undefined
        ? reject(new VortexError(`Could not import ${filePath}`, { kind: "not-found" }))
        : resolve(dlId);
    }),
  );
}

//Download and install a single requirement (with check = false, (re)install even if already installed)
async function downloadDropboxRequirement(api, gameSpec, requirement, check = true) {
  const gameId = gameSpec.game.id;
  const installed = isDropboxRequirementInstalled(api, gameId, requirement);
  if (installed && check) {
    return;
  }
  const key = guardKey(requirement);
  if (activeInstalls.has(key)) {
    log(
      "debug",
      `${requirement.userFacingName} install already running - skipping duplicate request`,
    );
    return;
  }
  activeInstalls.add(key);
  const NOTIF_ID = `${key}-installing`;
  api.sendNotification({
    //notification indicating install process
    id: NOTIF_ID,
    message: `Installing ${requirement.userFacingName}`,
    type: "activity",
    noDismiss: true,
    allowSuppress: false,
  });
  //captured before the install: these are the versions being replaced
  const previousModIds = requirementModIds(api, gameId, requirement);
  // A folder of its own, so two requirements whose files share a name never collide.
  const tempDir = path.join(util.getVortexPath("temp"), `dropbox-${Date.now()}`);
  try {
    const file = await fetchDropboxFile(requirement, tempDir);
    const dlId = await importDownload(api, file.filePath);
    // Declare the origin before the install pipeline reads it. InstallManager re-reads the
    // download from live state right before running the attribute extractors, and
    // processAttributes gates its whole Nexus fetch on modInfo.source === 'nexus' - so a
    // value written here is the one it sees, and writing it after the install is too late.
    // Any md5 match against Nexus for a file from this host is by definition a false one.
    // 'website' is the registered mod source id; 'other' is NOT one (the id behind the
    // "Other" label is 'unsupported'), and an unregistered id leaves the Source column
    // blank. See https://github.com/Nexus-Mods/Vortex/issues/21979.
    api.store.dispatch(actions.setDownloadModInfo(dlId, "source", "website"));
    const modId = await new Promise((resolve, reject) =>
      api.events.emit("start-install-download", dlId, { allowAutoEnable: false }, (err, result) =>
        err ? reject(err) : resolve(result),
      ),
    );
    const profileId = selectors.lastActiveProfileForGame(api.getState(), gameId);
    const batched = [
      actions.setModsEnabled(api, profileId, [modId], true, {
        allowAutoDeploy: true,
        installed: true,
      }),
      actions.setModAttribute(gameId, modId, "version", file.version || ""),
      actions.setModAttribute(
        gameId,
        modId,
        SHARE_ATTRIBUTE,
        normalizeDropboxUrl(requirement.shareUrl),
      ), // Marks this mod as the installed copy of the requirement
      actions.setModAttribute(gameId, modId, "source", "website"),
      actions.setModAttribute(gameId, modId, "url", pageUrl(requirement)), // Shown as the mod's "Source" link in the mod details (only rendered when source === 'website')
      actions.setModAttribute(gameId, modId, "customFileName", requirement.userFacingName), // Vortex renders a mod as customFileName || logicalFileName || fileName || name, and the install pipeline stamps fileName with the archive name - without this the mod list shows the raw archive
      // Vortex md5-matches every finished download against Nexus, game-agnostically, so a
      // shared third-party asset can be matched to an unrelated Nexus upload and have that
      // upload's modId/fileId stamped onto this mod. The update check then queries
      // <managed game>/mods/<foreign modId> and offers a completely unrelated mod as an update.
      // Deleting modId is the deterministic kill: checkModVersion bails on a non-numeric one.
      // Singular setModAttribute is required - the plural setModAttributes merges, and a merge
      // can never delete a key. The module's own attributes are namespaced and untouched.
      // Do not "tidy" these away. See https://github.com/Nexus-Mods/Vortex/issues/21979.
      actions.setModAttribute(gameId, modId, "modId", undefined),
      actions.setModAttribute(gameId, modId, "fileId", undefined),
    ];
    if (requirement.modType !== undefined) {
      // Optional: without it the extension's own installers decide the mod type
      batched.push(actions.setModType(gameId, modId, requirement.modType));
    }
    for (const oldModId of previousModIds) {
      // Disable the version this install replaces, so only one copy deploys
      if (oldModId !== modId) {
        batched.push(actions.setModEnabled(profileId, oldModId, false));
      }
    }
    util.batchDispatch(api.store, batched); // Will dispatch all actions.
  } catch (err) {
    //Show the user the download page if the download/install process fails
    // A cancel is the user's own decision (a dismissed installer dialog), not a failure: no
    // error is raised for it and no browser window is opened over them.
    if (err?.data?.kind === "user-canceled") {
      log("info", `${requirement.userFacingName} install canceled by the user`);
    } else {
      api.showErrorNotification(
        `Failed to download/install ${requirement.userFacingName}. You must download manually.`,
        err,
        { allowReport: false },
      );
      try {
        window.api.shell.openUrl(pageUrl(requirement));
      } catch (openErr) {
        api.showErrorNotification("Failed to open the URL", openErr, { allowReport: false });
      }
    }
  } finally {
    // import-downloads moves the file out on success; this clears whatever a failed run left.
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => null);
    activeInstalls.delete(key);
    api.dismissNotification(NOTIF_ID);
  }
}

//Download and install each requirement in the array (sequentially)
async function downloadDropbox(api, gameSpec, requirements, check = true) {
  for (const requirement of requirements) {
    await downloadDropboxRequirement(api, gameSpec, requirement, check);
  }
}

//Check the Dropbox link for a newer file for a single requirement and notify the user
async function checkForDropboxUpdateRequirement(api, gameSpec, requirement) {
  const gameId = gameSpec.game.id;
  if (!isDropboxRequirementInstalled(api, gameId, requirement)) {
    // Missing rather than outdated - install it instead of checking for updates to something
    // that is not there. Requirements the user installs manually opt out with autoInstall: false.
    if (requirement.autoInstall === false) {
      return;
    }
    log("info", `${requirement.userFacingName} is not installed - installing it`);
    return downloadDropboxRequirement(api, gameSpec, requirement);
  }
  const latest = await getLatestDropboxFile(requirement);
  if (versionSegments(latest?.version) === null) {
    return; //link unreachable, or the file name carries no version - nothing to compare against
  }
  // A copy whose version stamp is missing reads as null, which sorts lowest: it draws one
  // notification and the resulting install stamps it - self-healing.
  if (compareVersions(installedVersion(api, gameId, requirement), latest.version) >= 0) {
    return;
  }
  api.sendNotification({
    id: `${guardKey(requirement)}-update`,
    type: "warning",
    message: `${requirement.userFacingName} update available (${latest.version})`,
    allowSuppress: true,
    actions: [
      {
        title: "Download",
        action: (dismiss) => {
          downloadDropboxRequirement(api, gameSpec, requirement, false);
          dismiss();
        },
      },
    ],
  });
}

//Check the Dropbox links of each requirement in the array for newer files
async function checkForDropboxUpdate(api, gameSpec, requirements) {
  for (const requirement of requirements) {
    await checkForDropboxUpdateRequirement(api, gameSpec, requirement);
  }
}

module.exports = {
  downloadDropbox,
  checkForDropboxUpdate,
  downloadDropboxRequirement,
  checkForDropboxUpdateRequirement,
  isDropboxRequirementInstalled,
  getLatestDropboxFile,
  normalizeDropboxUrl,
  compareVersions,
};
