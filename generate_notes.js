/**
 * generate_notes.js
 * Scans every game-* folder in this repo, reads index.js, and writes mod-author
 * packaging documentation describing how a mod archive must be laid out for each
 * installer to recognise it. template-* folders are included only with --templates.
 *
 * Two files are written per extension, always:
 *   NOTES_FOR_MOD_AUTHORS.md       markdown, for the repo / GitHub
 *   NOTES_FOR_MOD_AUTHORS.bbcode  BBCode, paste-ready for a Nexus mod page
 *
 * Both are always overwritten (unless --check).
 *
 * Run with:  node generate_notes.js
 *            node generate_notes.js subnautica2 [GAME_ID ...]
 *            node generate_notes.js railroader --description
 *            node generate_notes.js --check [--templates] [GAME_ID ...]
 *            node generate_notes.js --lint [GAME_ID ...]
 *
 * Flags:
 *   --json       Write machine-readable JSON to stdout; progress goes to stderr. This
 *                does NOT make the run read-only: files are still written. Use --check.
 *   --templates  Also process template-* folders (when no GAME_ID args given).
 *   --check      Drift mode: compare what would be generated against the files on disk,
 *                write nothing, and exit non-zero if any file would change or is missing.
 *                Combine with --description to check DESCRIPTION.bbcode instead. With
 *                --lint, the only read-only ways to run this generator.
 *   --lint       Judge the DESCRIPTION*.bbcode pages on disk (what a push sends) and write
 *                nothing; implies --description. Reports per page: store (a listed store
 *                the game is not discovered by), bare (a bullet with no destination),
 *                duplicate, long-list (over 8 names in one list), name-repeat (a mod type
 *                name quoting its own trigger extension) and stale (known-outdated hand-written
 *                wording). Findings are for a person to judge: exit 0 unless a page errors.
 *   --description  Write DESCRIPTION.bbcode, the Nexus mod page description, in
 *                  place of the notes files. Two lists on the page are generated: the
 *                  "Mod Installation Notes" list (an extension with no installer gets
 *                  one line: every mod goes to the game root folder unprocessed; the
 *                  notes files say the same instead of an empty table), one line per installer, trigger +
 *                  destination, opening with the mod type ("UE4SS Script mods with a
 *                  ".lua" file install to the "Mods" folder."; trigger lists are shortened:
 *                  repeats dropped, numbered runs as "0000" to "0035", over 8 names shown as
 *                  6 plus a count), and the "Supported Versions" list, one line per store
 *                  app-id constant that resolves to a real value and is one of the ids the
 *                  game is discovered by (DISCOVERY_IDS_ACTIVE / spec discovery ids, plus the
 *                  gameFinderQuery ids of queryArgs extensions) - plus Ubisoft Connect
 *                  and EA, which are found through the Windows registry and so are
 *                  listed whenever their constant is declared. An existing page keeps
 *                  everything the author wrote - only each list between its heading and
 *                  the closing [/list] is replaced. A missing page is scaffolded with
 *                  the standard section order for the author to finish.
 *                  Three more blocks are added to a page that lacks them, never removed
 *                  or rewritten: a red symlink warning (supportsSymlinks resolves to
 *                  false), the yellow LogicMod-authors note (ue4-5 with a testLogic
 *                  installer) and a Credits section (CREDITS_BY_GAME, else the engine
 *                  default). A second run changes nothing. The summary counts each kind
 *                  and lists any extension whose supportsSymlinks could not be resolved.
 *                  Game pages (not templates) also carry the game's Notes for Mod Authors
 *                  as a [spoiler] section in front of Credits (else the donation block);
 *                  that block is generated and replaced on every run.
 *
 * Content comes from two tiers:
 *   Tier 1  hand-written prose keyed by the installer's test function name, with
 *           per-game constants interpolated. Accurate advice, real pitfalls.
 *   Tier 2  trigger conditions derived mechanically from the test function body,
 *           for installers with no tier-1 block yet. Always correct, less helpful.
 * The coverage report shows which extensions still lean on tier 2.
 *
 * JSON output schema:
 *   { timestamp, created, skipped, errors, drifted, tier1, tier2, dropped,
 *     results: [{ id, ok, error?, tier1, tier2, unknownFns, dropped }] }
 *   drifted     files that --check found different from what would be generated (0 otherwise);
 *               such a result has ok: false and error: "drift".
 *   unknownFns  installer test functions with no tier-1 block for the extension's engine.
 *   dropped     installer test functions that DO have a tier-1 block, but whose build
 *               returned null because a constant it needs did not resolve (usually an
 *               alternate constant name). Those sections silently fall to tier 2.
 */

const fs = require("fs");
const path = require("path");

const {
  buildSymbolTable,
  activeReassignments,
  splitAtTopLevelCommas,
  scanToMatchingClose,
  resolveWithFallback,
  isRealValue,
  parseHeader,
  extractModTypes,
  extractRegisterModTypes,
  extractInstallers,
} = require("./extension_parser");

const ROOT = __dirname;

/**
 * Write content to path via tmp-file + rename, same pattern as generate_explained.js
 * and lint_extensions.js's writeResultsAtomic -- a crash or Ctrl-C mid-write during a
 * multi-game batch must not leave a shipped generated doc truncated.
 */
function writeFileAtomic(filePath, content) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

// ── engine detection ────────────────────────────────────────────────────────

/**
 * Load a resources/lists/*.txt game-ID list. These are the authoritative record
 * of which template an extension follows (produced by categorize_games.py);
 * folder names and the index.js "Structure:" header are both unreliable.
 * First whitespace-separated column is the game ID; some lists are TSV.
 */
function loadList(name) {
  const file = path.join(ROOT, "resources", "lists", name);
  if (!fs.existsSync(file)) return new Set();
  return new Set(
    fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => (l.includes("\t") ? l.split("\t").filter(Boolean)[1] || "" : l).trim())
      .filter(Boolean),
  );
}

/**
 * Engine keys in precedence order, most specific first. Only genuine engine lists
 * appear here: games-unrealextension.txt and games-unreal4-5-xbox.txt are strict
 * subsets of games-ue4-5.txt (they record features, not engines), and the
 * downloader/github/loadorder lists are cross-cutting. Under this order every game
 * resolves to exactly one engine.
 */
const ENGINE_LISTS = [
  ["ue4-5", "games-ue4-5.txt"],
  ["ue2-3", "games-ue2-3.txt"],
  ["reengine", "games-reengine.txt"],
  ["unity-melon-bepinex", "games-unity-melonloader-bepinex.txt"],
  ["unity-umm", "games-unity-umm.txt"],
  ["anvil", "games-anvil.txt"],
  ["frostbite", "games-frostbite.txt"],
  ["farcry", "games-farcrygame.txt"],
  ["reloaded2", "games-reloaded2.txt"],
  ["cobra-acse", "games-cobra-acse.txt"],
  ["godot", "games-godot.txt"],
  ["rpgmaker", "games-rpgmaker.txt"],
  ["snowdrop", "games-snowdrop.txt"],
  ["srmm", "games-srmm.txt"],
  ["basic", "games-basic.txt"],
].map(([engine, file]) => [engine, loadList(file)]);

/** Template folder -> engine key, for the template-* extensions themselves. */
const TEMPLATE_ENGINES = {
  "template-ue4-5": "ue4-5",
  "template-tfcinstaller-ue2-3": "ue2-3",
  "template-reframework-fluffy": "reengine",
  "template-unitymelonloaderbepinex-hybrid": "unity-melon-bepinex",
  "template-unity-umm": "unity-umm",
  "template-anvilengine": "anvil",
  "template-frostbite": "frostbite",
  "template-farcry": "farcry",
  "template-reloaded2": "reloaded2",
  "template-cobraengineACSE": "cobra-acse",
  "template-godot": "godot",
  "template-rpgmaker": "rpgmaker",
  "template-snowdropengine": "snowdrop",
  "template-shinryu": "srmm",
  "template-basic": "basic",
};

/**
 * Map an extension directory to an engine key used to scope prose blocks.
 * Test-function names collide across engines (testRoot means something different
 * in a Unity extension than in an Unreal one), so a block only applies when its
 * engine matches.
 */
function detectEngine(dirName) {
  if (TEMPLATE_ENGINES[dirName]) return TEMPLATE_ENGINES[dirName];
  const id = dirName.replace(/^game-/, "");
  for (const [engine, set] of ENGINE_LISTS) {
    if (set.has(id)) return engine;
  }
  return null;
}

// ── value helpers ───────────────────────────────────────────────────────────

/**
 * Resolve an array-literal declaration (e.g. ROOT_FOLDERS = [EPIC_CODE_NAME, 'Engine'])
 * to its element values. buildSymbolTable only handles scalars, so arrays are read
 * straight from source here. A live guarded reassignment (`ASSEMBLY_FILES = [...]` inside
 * `if (BEPINEX_BUILD === "mono")`) wins over the declaration, as it does for scalars.
 * A literal extended with `.concat(OTHER_ARRAY)` (`[".pak", ".ucas", ".utoc"].concat(PAKMOD_EXTRA_EXTS)`)
 * gets OTHER_ARRAY's elements appended, and a `...OTHER_ARRAY` spread element is expanded in place.
 * Comments, empty strings, unresolved identifiers and `XXX` placeholders are dropped.
 */
/** Remove `//` and `/* *\/` comments from a source fragment, leaving string literals intact. */
function stripComments(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = s.indexOf(ch, i + 1);
      if (end === -1) return out + s.slice(i);
      out += s.slice(i, end + 1);
      i = end;
    } else if (ch === "/" && s[i + 1] === "/") {
      const end = s.indexOf("\n", i);
      if (end === -1) return out;
      i = end - 1;
    } else if (ch === "/" && s[i + 1] === "*") {
      const end = s.indexOf("*/", i + 2);
      if (end === -1) return out;
      i = end + 1;
    } else {
      out += ch;
    }
  }
  return out;
}

let reassignCache = { src: null, map: null };
const ARRAY_EXPR = String.raw`\[([^\]]*)\](?:\.concat\(\s*([A-Za-z_$]\w*)\s*\))?`;
function resolveArray(name, src, table, depth = 0) {
  if (reassignCache.src !== src) reassignCache = { src, map: activeReassignments(src) };
  const over = reassignCache.map.get(name);
  const m =
    (over && over.match(new RegExp(`^${ARRAY_EXPR}$`))) ||
    src.match(new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*${ARRAY_EXPR}`));
  if (!m) return [];
  const body = stripComments(m[1]);
  const own = body.trim()
    ? splitAtTopLevelCommas(body)
        .map((a) => a.trim())
        .filter((a) => a && !/^(['"`])\1$/.test(a))
        .flatMap((a) => {
          const spread = a.match(/^\.\.\.\s*([A-Za-z_$]\w*)$/);
          if (spread) {
            return spread[1] !== name && depth < 3
              ? resolveArray(spread[1], src, table, depth + 1)
              : [];
          }
          const v = resolveWithFallback(a, table, src);
          // An identifier that did not resolve is a name, not a value a user can ship.
          const isName = /^[A-Za-z_$][\w$.]*$/.test(a);
          if (v == null || (isName && String(v) === a)) return isName ? [] : [a];
          return [String(v)];
        })
        .filter((v) => v && !isPlaceholder(v))
    : [];
  const more = m[2] && m[2] !== name && depth < 3 ? resolveArray(m[2], src, table, depth + 1) : [];
  return [...own, ...more];
}

/**
 * Resolve an object property that holds an array, whether written inline
 * (`fileExt: ['.pak']`) or as a reference to an array constant (`fileExt: PAKMOD_EXTS`).
 */
function resolveObjArray(objName, prop, src, table) {
  const objRe = new RegExp(`(?:const|let)\\s+${objName}\\s*=\\s*\\{`);
  const om = objRe.exec(src);
  if (!om) return [];
  const open = src.indexOf("{", om.index);
  const close = scanToMatchingClose(src, open, "{", "}");
  if (close === -1) return [];
  const body = src.slice(open + 1, close);
  const pm = new RegExp(`\\b${prop}\\s*:\\s*([^,\\n]+)`).exec(body);
  if (!pm) return [];
  const raw = pm[1].trim().replace(/,$/, "");
  if (raw.startsWith("[")) {
    return splitAtTopLevelCommas(raw.slice(1, raw.lastIndexOf("]")))
      .map((a) => resolveWithFallback(a.trim(), table, src))
      .filter((x) => x && !String(x).includes("${"))
      .map(String);
  }
  if (/^[A-Za-z_$]\w*$/.test(raw)) return resolveArray(raw, src, table);
  return [];
}

/**
 * A template's constants are all `XXX` placeholders and its notes document them as written
 * (`a XXX_Data folder`). In a game, a value still holding `XXX` is an unfilled template constant,
 * so it is dropped rather than printed. buildNotes sets the flag per extension.
 */
let documentingTemplate = false;
function isPlaceholder(v) {
  return documentingTemplate ? v === "XXX" : String(v).includes("XXX");
}

/** Look up a scalar constant, returning null when unresolved or a placeholder. */
function val(name, src, table) {
  let v = table.has(name) ? table.get(name) : resolveWithFallback(name, table, src);
  if (v == null) return null;
  v = String(v);
  if (!v || v === name || isPlaceholder(v) || v === "null" || v.includes("${")) return null;
  return v;
}

/** Destination prose for a mod type that deploys to the game folder root. */
const GAME_FOLDER_PROSE = "the game folder";

/** What the pages say for an extension that registers no installer at all. */
const NO_INSTALLER_LINE =
  "All mods are installed to the game's root folder exactly as they are packaged, with no processing.";

/** Windows-style display path. */
function disp(p) {
  return p ? String(p).replace(/\//g, "\\") : p;
}

/** Environment variable shown for each `util.getVortexPath(...)` root a path constant is built on. */
const VORTEX_PATH_ENV = {
  home: "%USERPROFILE%",
  documents: "%USERPROFILE%\\Documents",
  localAppData: "%LOCALAPPDATA%",
  appData: "%APPDATA%",
};

/**
 * A deploy target fit to print, or null when part of it only exists at runtime. Path constants
 * built on `const DOCUMENTS = util.getVortexPath("documents")` resolve with the constant's name
 * still in them, and a per-user folder (`USERID_FOLDER`) is only filled in once the game is
 * found. The Vortex path roots become environment variables and the user folder `<User ID>`;
 * any other leftover top-level constant name, `${...}` or `XXX` placeholder drops the path, so
 * the caller falls back to prose instead of printing a variable name.
 */
function cleanTarget(p, src) {
  if (p == null) return null;
  // Decode \uXXXX escapes carried over from the string literal ("Ragnarök").
  let s = String(p)
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/%DOCUMENTS%/g, VORTEX_PATH_ENV.documents);
  if (s.includes("${") || (!documentingTemplate && s.includes("XXX"))) return null;
  const segs = s.split(/[\\/]+/);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    if (!/^[A-Za-z_$][\w$]*$/.test(seg)) continue;
    const decl = new RegExp(
      `^(?:const|let|var)\\s+${seg.replace(/\$/g, "\\$")}\\s*=\\s*(.*)$`,
      "m",
    ).exec(src);
    if (!decl) continue;
    const root = decl[1].match(/^util\.getVortexPath\(\s*["'](\w+)["']\s*\)/);
    if (root && VORTEX_PATH_ENV[root[1]]) segs[i] = VORTEX_PATH_ENV[root[1]];
    else if (/^USER_?ID/i.test(seg)) segs[i] = "<User ID>";
    else return null;
  }
  return segs.join("\\");
}

/**
 * The folder a `<folder>` directory is installed INTO. LOGICMODS_PATH names the parent in the
 * template (`.../Paks`) but already ends in the folder itself in 33 games (`.../Paks/LogicMods`),
 * so appending the folder name again printed `LogicMods\LogicMods`. Either way the pak lands in
 * `<parent>/<folder>`, so the parent is the one destination that reads right for both.
 */
function folderParent(p, folder) {
  const parts = String(p)
    .split(/[\\/]+/)
    .filter(Boolean);
  if (parts.length && parts[parts.length - 1].toLowerCase() === String(folder).toLowerCase()) {
    parts.pop();
  }
  return parts.join("/") || ".";
}

/** Quote a list of names for prose: `a`, `b` or `c`. */
function orList(items, wrap = "`") {
  const w = items.map((i) => `${wrap}${i}${wrap}`);
  if (w.length === 0) return "";
  if (w.length === 1) return w[0];
  return w.slice(0, -1).join(", ") + " or " + w[w.length - 1];
}

// ── tier 1: hand-written prose blocks ───────────────────────────────────────

/**
 * Each block is keyed by the installer's test function name plus the engine it
 * applies to. `build(v)` receives the resolved per-extension values and returns
 * the section content; returning null skips the block (constants unresolvable).
 *
 * Section shape:
 *   { title, lead, tree, rules[], pitfalls[], warn }
 */
/** Every engine except Unreal 4-5, which has its own more specific blocks. */
const NON_UE_ENGINES = [
  "basic",
  "unity-melon-bepinex",
  "unity-umm",
  "anvil",
  "frostbite",
  "farcry",
  "reloaded2",
  "cobra-acse",
  "godot",
  "rpgmaker",
  "snowdrop",
  "srmm",
  "ue2-3",
  "reengine",
];

/**
 * Section for an installer that handles a modding TOOL or loader rather than a mod.
 * Mod authors do not package these; the note exists so they can tell the difference.
 */
function toolBlock({ title, tool, marker, installsTo, extra }) {
  return {
    title,
    quick: marker ? `a \`${marker}\` file` : `the ${tool} files`,
    installsTo: installsTo || null,
    lead:
      `This installer handles ${tool}, not mods for it. It exists so users can ` +
      `install ${tool} through Vortex, and mod authors normally never package this.`,
    rules: [
      marker ? `Recognised by a file named \`${marker}\` in the archive.` : null,
      ...(extra || []),
    ].filter(Boolean),
    pitfalls: [
      `If you bundle ${tool} inside your mod archive, Vortex treats the whole download as ` +
        `${tool} rather than as your mod. Ship the mod alone and list ${tool} as a requirement.`,
    ],
  };
}

/**
 * Section for an installer matched by a set of file names and/or extensions.
 * Returns null when nothing resolved, so the caller can fall through to tier 2.
 */
function matchBlock({
  title,
  lead,
  files,
  exts,
  folders,
  installsTo,
  tree,
  pitfalls,
  warn,
  targetIsProse,
  userProfile,
}) {
  const rules = [];
  if (folders && folders.length) {
    rules.push(`Recognised by a folder named ${orList(folders)} in the archive.`);
  }
  if (files && files.length) {
    rules.push(
      `Recognised by ${folders && folders.length ? "a file" : "any file"} named ${orList(files)}.`,
    );
  }
  if (exts && exts.length) {
    rules.push(
      `Recognised by any file with the ${orList(exts)} extension${exts.length > 1 ? "s" : ""}.`,
    );
  }
  if (!rules.length) return null;
  const quickBits = [
    folders && folders.length ? `a \`${folders[0]}\` folder` : null,
    files && files.length ? `a \`${files[0]}\` file` : null,
    exts && exts.length ? `a \`${exts[0]}\` file` : null,
  ].filter(Boolean);
  return {
    title,
    quick: quickBits.join(" or "),
    installsTo: installsTo || null,
    targetIsProse: !!targetIsProse,
    lead: lead || null,
    tree: tree || null,
    rules,
    pitfalls: pitfalls || [],
    warn: warn || null,
    userProfile: !!userProfile,
  };
}

const PROSE = [
  {
    fn: "testJiangyu",
    game: "game-menace",
    build: (v) =>
      v.JIANGYU_FILE
        ? toolBlock({
            title: "Jiangyu Loader",
            tool: "the Jiangyu loader",
            marker: v.JIANGYU_FILE,
            installsTo: v.JIANGYU_PATH,
            extra: [
              "Vortex downloads and installs the loader on its own, so this installer only comes into " +
                "play for a copy the user downloaded by hand from a mod page.",
            ],
          })
        : null,
  },
  {
    fn: "testJiangyuMod",
    game: "game-menace",
    build: (v) =>
      matchBlock({
        title: "Jiangyu Mods",
        files: v.JIANGYUMOD_FILE ? [v.JIANGYUMOD_FILE] : [],
        installsTo: v.JIANGYUMOD_PATH,
        lead:
          "A Jiangyu mod is a folder with a `jiangyu.json` manifest at its root, exactly as " +
          "`jiangyu package` produces it. Ship that folder inside the archive, or the manifest " +
          "and its files at the top level - both are handled.",
        tree: [
          "MyMod.zip",
          "└── MyMod",
          "    ├── jiangyu.json",
          "    ├── assets",
          "    ├── compiled",
          "    └── templates",
        ].join("\n"),
        pitfalls: [
          "The `name` in `jiangyu.json` decides the folder your mod is installed into, and is what " +
            "other mods list in `depends`. Keep it stable between releases - changing it makes " +
            "existing dependencies stop resolving.",
          "Vortex adds a numbered prefix to that folder so the load order page can reorder your " +
            "mod. Do not rely on the folder name in any path inside your mod.",
        ],
      }),
  },
  {
    fn: "testPatch",
    game: "game-helldivers2",
    build: () => ({
      title: "Patch Mods (.patch_0)",
      quick: "a file named `<archive hash>.patch_0`",
      lead:
        "Almost every Helldivers 2 mod is a patch mod. A patch file is named after the game " +
        "archive it edits - a 16-character hex hash - followed by a patch number. Graphics " +
        "and sound mods use the same format and are installed the same way.",
      tree: [
        "MyArmourMod.zip",
        "├── 9ba626afa44a3aa3.patch_0",
        "├── 9ba626afa44a3aa3.patch_0.gpu_resources",
        "├── 9ba626afa44a3aa3.patch_0.stream",
        "└── readme.txt",
      ].join("\n"),
      rules: [
        "Recognised by any file matching `<16 hex characters>.patch_<number>`, for example " +
          "`9ba626afa44a3aa3.patch_0`. Any archive hash works - there is no fixed list.",
        "The `.gpu_resources` and `.stream` sidecar files are optional. Ship whichever ones your " +
          "mod actually needs; some archives have them and some do not.",
        "Always number your files from `patch_0`. Vortex renumbers them at deploy time so that " +
          "every mod editing the same archive gets a unique, gap-free number, in the order the " +
          "user sets on the Mod Priority page. Your own numbering only decides the order of your " +
          "own files within one archive.",
        "A mod may ship patch files for several archives at once, and several files for one " +
          "archive (`x.patch_0` and `x.patch_1`). Both are handled.",
        "To offer variants without a manifest, put each complete set of patch files in its own " +
          "folder. Vortex asks the user which folder to install - once for the whole mod, not " +
          "once per file. Name the folders after what they contain, because those names are what " +
          "the user picks from.",
        "A `manifest.json` at the top level of the archive is read and preferred over the folder " +
          "layout, so your options get real names, descriptions, thumbnails and categories. All " +
          "three community versions are supported: the legacy format (no `Version` property, " +
          "`Options` is a list of folder names and exactly one is installed), version 1 " +
          "(`Options` are objects with `Name`, `Description`, `Image`, `Include` and " +
          "`SubOptions`) and version 2 (version 1 plus `Guid`, `CategoryRef` and `Categories`).",
        "In a version 1 or 2 manifest the user may enable any number of options, and each " +
          "enabled option installs exactly one of its `SubOptions`. A folder named in `Include` " +
          "must hold the patch files directly - subfolders of it are not searched.",
        "If a manifest cannot be read, or none of its options resolve to folders that exist in " +
          "the archive, Vortex logs the problem and falls back to the folder layout. A bad " +
          "manifest never stops the mod from installing.",
        "When two enabled options both change the same archive, Vortex numbers their files into " +
          "one contiguous sequence for that archive. This is expected, not a conflict.",
        "Documentation files at the top level of the archive are installed alongside the patch " +
          "files and are left untouched. `manifest.json` and any images it points at are " +
          "not installed - they are only used for the option picker.",
      ],
      pitfalls: [
        'Numbering files `patch_1` or higher to "load later" - the number in your archive is not ' +
          "the number the game sees. Priority is set by the user in Vortex, not by the file name.",
        "Renaming a patch file to a hash the installed game does not have. The game silently " +
          "ignores a patch for an archive it does not know, so the mod appears to do nothing. " +
          "Vortex warns about this at install time.",
        "Putting a readme inside each variant folder - only files at the top level of the archive " +
          "are installed alongside the patch files, so keep shared documentation at the root.",
        "Leaving out a `.patch_0` file but shipping its `.gpu_resources` or `.stream` sidecar. A " +
          "sidecar is only ever installed next to the patch file it belongs to.",
        "Nesting patch files one level below the folder you list in `Include`. That folder is " +
          "read without recursion, so a mod built that way installs nothing.",
        "Hand-numbering files across option folders to control which option wins. Numbers are " +
          "reassigned per archive in option order; only the order of your files inside a single " +
          "folder is preserved.",
        "Expecting `NexusData` in a manifest to point Vortex at the right Nexus Mods " +
          "mod page. Vortex tracks that identity on its own and ignores the field.",
      ],
    }),
  },
  {
    fn: "testMaps",
    engine: "godot",
    build: (v) => {
      const exts = v.MAPS_EXTS && v.MAPS_EXTS.length ? v.MAPS_EXTS : [".map"];
      const target = v.MAPS_PATH || v.MAPS_FOLDER || "maps";
      return {
        title: "Map Mods",
        quick: `a \`${exts[0]}\` file with a matching \`.json\` file`,
        installsTo: target,
        lead:
          "Levels for the game's map loader. A map is a pair of files sharing one name, " +
          "kept together in a folder named after the map.",
        tree: [
          "MyMap.zip",
          "└── Author-MyMap\\",
          "    ├── mymap.map",
          "    ├── mymap.json",
          "    └── textures\\",
        ].join("\n"),
        rules: [
          `Recognised by a file with the ${orList(exts)} extension that has a \`.json\` file ` +
            `of the same name beside it.`,
          "The folder holding the pair is kept as the installed map folder, so name it after the map.",
          "A `textures` subfolder alongside the pair is installed with it.",
        ],
        pitfalls: [
          "Shipping the map file without its matching `.json` - the pair is what identifies a map, " +
            "so a lone map file is not recognised and falls through to another installer.",
          "Putting the map files at the archive root - the installer then has to invent a folder " +
            "name from the archive filename.",
        ],
      };
    },
  },
  {
    fn: "testLogic",
    engine: "ue4-5",
    build: (v) => {
      const folder = v.LOGICMODS_FOLDER || "LogicMods";
      return {
        title: `Blueprint Mods (${folder})`,
        quick: `a \`${folder}\` folder`,
        installsTo: v.LOGICMODS_PATH ? folderParent(v.LOGICMODS_PATH, folder) : null,
        lead:
          `Blueprint mods built against UE4SS must sit inside a folder named \`${folder}\`. ` +
          `This is the single most common packaging mistake for Unreal games.`,
        tree: ["MyBlueprintMod.zip", `└── ${folder}\\`, "    └── MyBlueprintMod.pak"].join("\n"),
        rules: [
          `The archive must contain a folder named \`${folder}\` (case does not matter).`,
          `Everything from the \`${folder}\` folder down is copied to the game, keeping its structure.`,
          `Extra folders above \`${folder}\` are fine - the installer finds it at any depth.`,
        ],
        pitfalls: [
          `Putting the \`.pak\` at the top level of the archive with no \`${folder}\` folder. ` +
            `Vortex then treats it as an ordinary pak mod, installs it to the wrong place, and the blueprint mod never loads.`,
          `Renaming the folder (\`Logic_Mods\`, \`logicmod\`, \`BPMods\`) - the name must be exactly \`${folder}\`.`,
        ],
        warn: `A blueprint \`.pak\` outside a \`${folder}\` folder will install, but it will not work in game.`,
      };
    },
  },
  {
    fn: "testUe4ssCombo",
    engine: "ue4-5",
    build: (v) => ({
      title: "Combo Mods (pak + UE4SS script/DLL together)",
      quick: "both a `Content` and a `Binaries` folder",
      installsTo: v.EPIC_CODE_NAME || null,
      lead:
        "Use this layout when one download ships both game content and UE4SS mods. " +
        "It is recognised by the presence of BOTH a `Content` folder and a `Binaries` folder, " +
        "laid out exactly as they appear inside the game folder.",
      tree: [
        "MyComboMod.zip",
        "├── Content\\",
        "│   └── Paks\\",
        `│       └── ${v.LOGICMODS_FOLDER || "LogicMods"}\\`,
        "│           └── MyBlueprintMod.pak",
        "└── Binaries\\",
        "    └── Win64\\",
        "        └── ue4ss\\",
        "            └── Mods\\",
        "                └── MyScriptMod\\",
        "                    └── Scripts\\",
        "                        └── main.lua",
      ].join("\n"),
      rules: [
        "Both a `Content` folder and a `Binaries` folder must be present, or this installer is skipped.",
        "Mirror the real in-game folder structure below those two folders.",
        "This installer is tested before the individual pak/script/DLL installers, so a matching archive is always handled as a combo.",
      ],
      pitfalls: [
        "Including only one of `Content` or `Binaries` - the archive then falls through to a different installer.",
        "Adding an extra wrapper folder between `Binaries` and `Win64`.",
      ],
    }),
  },
  {
    fn: "testPak",
    engine: "ue4-5",
    build: (v) => ({
      title: "Pak Mods",
      quick: `a \`${v.PAK_EXT || ".pak"}\` file`,
      installsTo: v.PAKMOD_PATH || null,
      lead:
        `Standard content mods: one or more \`${v.PAK_EXT || ".pak"}\` files. ` +
        `Vortex copies just the pak files themselves, flattened, so the folder structure around them does not matter.`,
      tree: ["MyPakMod.zip", "└── MyPakMod.pak"].join("\n"),
      rules: [
        `Any archive containing a \`${v.PAK_EXT || ".pak"}\` file reaches this installer (unless an earlier one claimed it).`,
        "Only the pak files are installed - surrounding folders are discarded.",
        v.PAKMOD_EXTS && v.PAKMOD_EXTS.length > 1
          ? `Companion files are installed alongside paks: ${orList(
              v.PAKMOD_EXTS.filter((e) => e !== (v.PAK_EXT || ".pak")),
            )}.`
          : null,
        "If the archive holds more than one pak, Vortex asks the user which to install - useful for optional variants.",
      ].filter(Boolean),
      pitfalls: [
        "Shipping several unrelated paks in one archive when you meant them all to install - the user gets a choice dialog and may pick only one.",
        `Blueprint mods belong in a \`${v.LOGICMODS_FOLDER || "LogicMods"}\` folder instead - see above.`,
      ],
    }),
  },
  {
    fn: "testUe4ss",
    engine: "ue4-5",
    build: (v) => {
      const file = v.UE4SS_FILE;
      const subs = v.UE4SS_SUBFOLDERS || [];
      if (!file && !subs.length) return null;
      return {
        title: "UE4SS",
        toolName: "UE4SS",
        quick: file ? `a \`${file}\` file` : "the UE4SS support folders",
        installsTo: v.BINARIES_PATH || null,
        lead:
          "This installer handles the UE4SS runtime package, not individual mods. " +
          "Most authors never need it - it exists so users can install UE4SS through Vortex.",
        rules: [
          file ? `Recognised by a file named \`${file}\` at any level of the archive.` : null,
          subs.length
            ? `Also recognised by any of the UE4SS support folders: ${orList(subs)}.`
            : null,
        ].filter(Boolean),
        pitfalls: [
          `If your script mod archive happens to contain a file named \`${file || "the UE4SS loader DLL"}\`, ` +
            "it will be treated as a UE4SS install rather than as your mod.",
        ],
      };
    },
  },
  {
    fn: "testSigBypass",
    engine: "ue4-5",
    build: (v) => {
      if (!v.SIGBYPASS_DLL || !v.SIGBYPASS_LUA) return null;
      return {
        title: "Signature Bypass",
        quick: `a \`${v.SIGBYPASS_DLL}\` file and a \`${v.SIGBYPASS_LUA}\` file`,
        installsTo: v.BINARIES_PATH || null,
        lead: "This game ships signed pak files, so a signature bypass is required before most mods will load.",
        rules: [
          `Recognised only when BOTH \`${v.SIGBYPASS_DLL}\` and \`${v.SIGBYPASS_LUA}\` are present in the archive.`,
        ],
        pitfalls: [
          "Shipping only one of the two files - the archive will fall through to another installer.",
        ],
      };
    },
  },
  {
    fn: "testScripts",
    engine: "ue4-5",
    build: (v) => {
      const folder = v.SCRIPTS_FOLDER || "Scripts";
      const ext = v.SCRIPTS_EXT || ".lua";
      return {
        title: "UE4SS Script Mods (Lua)",
        quick: `a \`${ext}\` file and a \`${folder}\` folder`,
        installsTo: v.SCRIPTS_PATH || null,
        lead: `Lua mods for UE4SS. Recognised when the archive holds both a \`${ext}\` file and a folder named \`${folder}\`.`,
        tree: [
          "MyScriptMod.zip",
          "└── MyScriptMod\\",
          `    └── ${folder}\\`,
          "        └── main.lua",
        ].join("\n"),
        rules: [
          `The archive must contain a \`${ext}\` file AND a folder named \`${folder}\`.`,
          `Wrap the \`${folder}\` folder in a folder named after your mod. That folder name becomes the mod's UE4SS name ` +
            `and is what gets written to the load order.`,
          `If you omit the wrapper folder, Vortex falls back to naming the mod after the archive file.`,
        ],
        pitfalls: [
          `Putting \`main.lua\` directly in the archive root with no \`${folder}\` folder - the mod is not recognised as a script mod.`,
          "Naming the wrapper folder something generic like `Mods` - that name is what appears in the load order.",
        ],
      };
    },
  },
  {
    fn: "testDll",
    engine: "ue4-5",
    build: (v) => {
      const folder = v.DLL_FOLDER || "dlls";
      const ext = v.DLL_EXT || ".dll";
      return {
        title: "UE4SS DLL Mods (C++)",
        quick: `a \`${ext}\` file and a \`${folder}\` folder`,
        installsTo: v.DLL_PATH || null,
        lead: `Compiled UE4SS mods. Recognised when the archive holds both a \`${ext}\` file and a folder named \`${folder}\`.`,
        tree: [
          "MyDllMod.zip",
          "└── MyDllMod\\",
          `    └── ${folder}\\`,
          "        └── main.dll",
        ].join("\n"),
        rules: [
          `The archive must contain a \`${ext}\` file AND a folder named \`${folder}\`.`,
          `Wrap the \`${folder}\` folder in a folder named after your mod - that name is used in the load order.`,
        ],
        pitfalls: [
          `A bare \`${ext}\` with no \`${folder}\` folder is not recognised as a UE4SS DLL mod and will reach the fallback installer.`,
        ],
      };
    },
  },
  {
    fn: "testRoot",
    engine: "ue4-5",
    build: (v) => {
      const all = [
        ...(v.ROOT_FOLDERS || []),
        ...(v.ROOTSUB_FOLDERS || []),
        ...(v.CONTENTSUB_FOLDERS || []),
      ];
      if (!all.length) return null;
      return {
        title: "Root / Game Folder Mods",
        quick: `a top-level folder such as ${orList(all.slice(0, 3))}`,
        installsTo: GAME_FOLDER_PROSE,
        targetIsProse: true,
        lead: "For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.",
        tree: [
          "MyRootMod.zip",
          `└── ${(v.ROOT_FOLDERS && v.ROOT_FOLDERS[0]) || "Engine"}\\`,
          "    └── ... files in their real relative locations",
        ].join("\n"),
        rules: [
          `Recognised by a top-level folder matching any of: ${orList(all)}.`,
          "The matched folder and everything below it is copied into the game folder, preserving structure.",
        ],
        pitfalls: [
          "Zipping the folder that CONTAINS the game folders instead of the game folders themselves adds an extra level and misplaces every file.",
        ],
      };
    },
  },
  {
    fn: "testConfig",
    engine: "ue4-5",
    build: (v) => {
      const files = v.CONFIG_FILES || [];
      if (!files.length) return null;
      return {
        title: "Config File Mods",
        userProfile: true,
        quick: `a config file such as ${orList(files.slice(0, 2))}`,
        installsTo: v.CONFIG_PATH || null,
        lead: "Config tweaks are deployed to the game's config folder in your user profile, not into the game installation.",
        rules: [
          `Recognised by any of these filenames in the archive: ${orList(files)}.`,
          v.CONFIG_PATH ? `Installed to \`${disp(v.CONFIG_PATH)}\`.` : null,
        ].filter(Boolean),
        pitfalls: [
          "Shipping a config file with one of these names inside an unrelated mod - the whole archive is then treated as a config mod.",
        ],
      };
    },
  },
  {
    fn: "testSave",
    engine: "ue4-5",
    build: (v) => {
      const exts = v.SAVE_EXTS || [];
      if (!exts.length) return null;
      return {
        title: "Save Game Files",
        userProfile: true,
        quick: `a ${orList(exts)} file`,
        installsTo: null,
        lead: "Save files are deployed to the game's save folder in your user profile.",
        rules: [`Recognised by any file with extension ${orList(exts)}.`],
        pitfalls: [
          `Including an example save alongside a normal mod - the archive is then treated as a save, not a mod.`,
        ],
      };
    },
  },
  {
    fn: "testModKitMod",
    engine: "ue4-5",
    build: (v) => {
      if (!v.MODKITMOD_FILE) return null;
      return {
        title: "Official Mod Kit Mods",
        quick: `a \`${v.MODKITMOD_FILE}\` manifest`,
        installsTo: null,
        lead: `Mods produced with the game's official mod kit, identified by a \`${v.MODKITMOD_FILE}\` manifest.`,
        rules: [
          `Recognised when the archive contains \`${v.MODKITMOD_FILE}\`` +
            (v.MODKITMOD_EXT ? ` AND a \`${v.MODKITMOD_EXT}\` file.` : "."),
          `The install folder name is read from the \`modPluginName\` field inside \`${v.MODKITMOD_FILE}\`.`,
        ],
        pitfalls: [
          `A \`modPluginName\` that does not match what the mod was built as will crash the game. ` +
            `Keep it identical to the mod kit plugin name.`,
        ],
      };
    },
  },
  {
    fn: "testBinaries",
    engine: "ue4-5",
    build: (v) => ({
      title: "Fallback Installer",
      // "anything not matched" is what renderDescription keys its catch-all line on.
      quick: "anything not matched above with no pak file",
      installsTo: v.BINARIES_PATH || null,
      lead:
        "This is the catch-all. Any archive with no `.pak` file that matched none of the installers above " +
        "lands here and is copied, unchanged, into the game's binaries folder.",
      rules: [
        "Reaching this installer usually means the archive was not laid out in a way Vortex recognised.",
        "Vortex shows the user a notification when a mod installs through the fallback.",
      ],
      pitfalls: [
        "If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report it as broken.",
      ],
      warn: "Landing in the fallback installer is a signal your archive layout needs fixing.",
    }),
  },

  {
    // Legacy Unreal pak installer, declared as a const arrow inside main().
    fn: "testForUnrealMod",
    engine: "ue4-5",
    build: (v) => {
      const exts =
        v.UNREAL_FILE_EXTS && v.UNREAL_FILE_EXTS.length
          ? v.UNREAL_FILE_EXTS
          : v.PAK_EXT
            ? [v.PAK_EXT]
            : [".pak"];
      return {
        title: "Pak Mods",
        quick: `a \`${exts[0]}\` file`,
        installsTo: v.UNREAL_MODS_PATH || null,
        lead:
          `Standard content mods: one or more \`${exts[0]}\` files. Vortex installs the mod files ` +
          `themselves, so the folder structure around them in the archive does not matter.`,
        tree: ["MyPakMod.zip", `└── MyPakMod${exts[0]}`].join("\n"),
        rules: [
          `Recognised by any file with the ${orList(exts)} extension${exts.length > 1 ? "s" : ""}.`,
          "Surrounding folders are discarded - only the mod files are installed.",
          "If the archive holds several mod files, Vortex asks the user which to install, which is " +
            "useful for shipping optional variants in one download.",
        ],
        pitfalls: [
          "Shipping several unrelated paks in one archive when you meant them all to install - " +
            "the user gets a choice dialog and may pick only one.",
        ],
      };
    },
  },

  // ── Unity: BepInEx / MelonLoader ──────────────────────────────────────────
  // `loader` ties a block to one mod loader; it is left out when the extension does not offer
  // that loader (see unityLoaders).
  {
    fn: "testBepinex",
    engine: ["unity-melon-bepinex"],
    loader: "bep",
    build: (v) => {
      if (!v.BEPINEX_FOLDER || !v.BEPINEX_DLL_FILE) return null;
      return toolBlock({
        title: "BepInEx (mod loader)",
        tool: "BepInEx",
        marker: v.BEPINEX_DLL_FILE,
        installsTo: GAME_FOLDER_PROSE,
        extra: [
          `Requires BOTH a folder named \`${v.BEPINEX_FOLDER}\` and the loader file \`${v.BEPINEX_DLL_FILE}\`.`,
        ],
      });
    },
  },
  {
    fn: "testMelon",
    engine: ["unity-melon-bepinex"],
    loader: "mel",
    build: (v) => {
      if (!v.MELON_FOLDER || !v.MELON_DLL_FILE) return null;
      return toolBlock({
        title: "MelonLoader (mod loader)",
        tool: "MelonLoader",
        marker: v.MELON_DLL_FILE,
        installsTo: GAME_FOLDER_PROSE,
        extra: [
          `Requires BOTH a folder named \`${v.MELON_FOLDER}\` and the loader file \`${v.MELON_DLL_FILE}\`.`,
        ],
      });
    },
  },
  {
    fn: "testPlugin",
    engine: ["unity-melon-bepinex"],
    // One section per mod loader the extension offers: the installer reads each DLL to tell
    // which loader it was built for and routes it to that loader's folder.
    build: (v) => {
      const ext = (v.PLUGIN_EXTS && v.PLUGIN_EXTS[0]) || ".dll";
      const both = v.LOADERS.length > 1;
      // A loose plugin is wrapped in a folder of its own (pluginFolderName in the extension).
      const wrap = (p) => (v.WRAPS_PLUGINS ? `${p}\\<ModName>` : p);
      const wrapRule = v.WRAPS_PLUGINS
        ? "A loose DLL is put in a folder of its own, named after its folder in the archive or " +
          "else after the DLL, so files from different mods cannot overwrite each other."
        : null;
      const keepRule = (folders, dest) =>
        folders && folders.length
          ? `An archive that already has a ${orList(folders)} folder keeps that layout and ` +
            `installs to ${dest}.`
          : null;
      const sharedPitfalls = [
        "Shipping a plugin together with loader files, which makes the archive look like a loader install instead.",
        both
          ? "Putting BepInEx and MelonLoader plugins in one archive. Vortex cannot install both " +
            "kinds together - publish them as separate files."
          : null,
      ].filter(Boolean);
      const cancelLine =
        v.preventPluginInstall === "true"
          ? "Plugin archives built for a different mod loader than the one installed" +
            `${both ? ", or mixing BepInEx and MelonLoader plugins," : ""} are cancelled.`
          : null;
      const out = [];
      if (v.LOADERS.includes("bep")) {
        const plugins = v.BEPINEX_PLUGINS_PATH || `${v.BEPINEX_FOLDER}\\plugins`;
        const patchers = v.BEPINEX_PATCHERS_PATH || `${v.BEPINEX_FOLDER}\\patchers`;
        out.push({
          title: "BepInEx Plugin Mods",
          quick: `a \`${ext}\` file built for BepInEx`,
          installsTo: wrap(plugins),
          lead:
            "The normal shape for a BepInEx mod: a compiled plugin DLL. Vortex reads each DLL to " +
            "tell which mod loader it was built for, so the archive does not need to reproduce " +
            "the BepInEx folder structure.",
          tree: ["MyPlugin.zip", "└── MyPlugin.dll"].join("\n"),
          rules: [
            `Recognised by any \`${ext}\` file that references BepInEx.`,
            wrapRule,
            `A preloader patcher (a DLL that references \`${v.BEP_PATCHER_STRING || "BepInEx.Preloader.Core.Patching"}\`) ` +
              `goes to \`${disp(wrap(patchers))}\` instead.`,
            keepRule(v.BEPINEX_MOD_FOLDERS, `\`${disp(v.BEPINEX_MOD_PATH || v.BEPINEX_FOLDER)}\``),
          ].filter(Boolean),
          pitfalls: sharedPitfalls,
        });
      }
      if (v.LOADERS.includes("mel")) {
        const mods = v.MELON_MODS_PATH || "Mods";
        const plugins = v.MELON_PLUGINS_PATH || "Plugins";
        out.push({
          title: "MelonLoader Mods",
          quick: `a \`${ext}\` file built for MelonLoader`,
          installsTo: wrap(mods),
          lead:
            "The normal shape for a MelonLoader mod: a compiled mod DLL. Vortex reads each DLL to " +
            "tell which mod loader it was built for, so the archive does not need to reproduce " +
            "the MelonLoader folder structure.",
          tree: ["MyMelonMod.zip", "└── MyMelonMod.dll"].join("\n"),
          rules: [
            `Recognised by any \`${ext}\` file that references MelonLoader.`,
            wrapRule,
            v.MELON_MANIFEST && v.WRAPS_PLUGINS
              ? "MelonLoader only loads a mod in its own folder when that folder holds a " +
                "`manifest.json`, so Vortex writes one when the archive has none."
              : null,
            `A MelonLoader plugin (a DLL that references \`${v.MEL_PLUGIN_STRING || "MelonPlugin"}\`) ` +
              `goes to \`${disp(wrap(plugins))}\` instead.`,
            keepRule(
              v.MELON_MOD_FOLDERS,
              !v.MELON_MOD_PATH || v.MELON_MOD_PATH === "."
                ? GAME_FOLDER_PROSE
                : `\`${disp(v.MELON_MOD_PATH)}\``,
            ),
          ].filter(Boolean),
          pitfalls: sharedPitfalls,
        });
      }
      if (!out.length) return null;
      const last = out[out.length - 1];
      last.rules.push(
        "An archive whose DLLs reference neither loader installs to the game folder, and Vortex " +
          "shows a notification asking the user to check the mod page.",
      );
      if (cancelLine) last.descExtra = [cancelLine];
      return out;
    },
  },
  {
    fn: "testBepCfgMan",
    engine: ["unity-melon-bepinex"],
    loader: "bep",
    build: (v) => {
      if (!v.BEPCFGMAN_FILE) return null;
      return toolBlock({
        title: "BepInEx Configuration Manager",
        tool: "the BepInEx Configuration Manager plugin",
        marker: v.BEPCFGMAN_FILE,
        installsTo: v.BEPCFGMAN_PATH,
        extra: [`Requires the file \`${v.BEPCFGMAN_FILE}\` together with a \`plugins\` folder.`],
      });
    },
  },
  {
    fn: "testMelonPrefMan",
    engine: ["unity-melon-bepinex"],
    loader: "mel",
    build: (v) => {
      if (!v.MELONPREFMAN_FILE) return null;
      return toolBlock({
        title: "MelonLoader Preferences Manager",
        tool: "the MelonLoader Preferences Manager",
        marker: v.MELONPREFMAN_FILE,
        installsTo: v.MELONPREFMAN_PATH,
      });
    },
  },
  // ── Unity Mod Manager / Railloader ─────────────────────────────────────────
  {
    fn: "testUmm",
    engine: "unity-umm",
    build: (v) =>
      v.UMM_INST_EXEC
        ? toolBlock({
            title: "Unity Mod Manager (tool)",
            tool: "Unity Mod Manager",
            marker: v.UMM_INST_EXEC,
            installsTo: ".",
            extra: [
              "Vortex reproduces the loader patch the manager would otherwise apply, so it deploys and " +
                "purges like any other mod.",
            ],
          })
        : null,
  },
  {
    fn: "testUmmMod",
    engine: "unity-umm",
    build: (v) => {
      if (!v.UMM_MOD_FILE) return null;
      const folder = v.MODS_FOLDER || "Mods";
      return {
        title: "Unity Mod Manager Mods",
        quick: `an \`${v.UMM_MOD_FILE}\` file`,
        installsTo: `${folder}\\<ModName>`,
        lead:
          `Mods for Unity Mod Manager, told apart by their manifest. ` +
          `Each one gets its own folder under \`${folder}\`.`,
        tree: ["MyUmmMod.zip", `├── ${v.UMM_MOD_FILE}`, "└── MyUmmMod.dll"].join("\n"),
        rules: [
          `Recognised by a file named \`${v.UMM_MOD_FILE}\` at any level of the archive. A \`.dll\` is not required.`,
          `Every folder holding \`${v.UMM_MOD_FILE}\` is installed as its own mod, so one archive can carry several mods.`,
          `The mod folder name comes from the folder holding the manifest. A flat archive is ` +
            `named from the \`Id\` field in \`${v.UMM_MOD_FILE}\` instead, so keep that field filled in.`,
          `Folders above a mod folder, such as a \`${folder}\` wrapper, are dropped.`,
        ],
        pitfalls: [
          `Keeping files a mod needs outside its own folder - only the contents of each ` +
            `\`${v.UMM_MOD_FILE}\` folder are installed.`,
        ],
      };
    },
  },
  {
    fn: "testRailloaderMod",
    engine: "unity-umm",
    build: (v) => {
      if (!v.RAILLOADER_MOD_FILE) return null;
      const folder = v.MODS_FOLDER || "Mods";
      // The constant is lower case because matching is case-insensitive; mods ship it capitalised.
      const manifest =
        v.RAILLOADER_MOD_FILE.charAt(0).toUpperCase() + v.RAILLOADER_MOD_FILE.slice(1);
      return {
        title: "Railloader Mods",
        quick: `a \`${manifest}\` file`,
        installsTo: `${folder}\\<ModName>`,
        lead:
          `Mods for Railloader, the game's second mod loader. They live in the same ` +
          `\`${folder}\` folder as Unity Mod Manager mods, and are told apart by their manifest.`,
        tree: [
          "MyRailloaderMod.zip",
          `└── MyRailloaderMod\\`,
          `    ├── ${manifest}`,
          "    └── MyRailloaderMod.dll",
        ].join("\n"),
        rules: [
          `Recognised by a file named \`${manifest}\`.`,
          `A leading \`${folder}\` folder in the archive is dropped - the installer already ` +
            `targets \`${folder}\`, so it is not doubled up.`,
          `A flat archive is named from the \`id\` field in \`${manifest}\`.`,
        ],
        pitfalls: [
          `Mixing the two formats in one archive. A mod needs either \`${manifest}\` for ` +
            `Railloader or a Unity Mod Manager manifest, not both - each loader rejects the other's mods.`,
        ],
      };
    },
  },
  {
    fn: "testRailloaderApp",
    engine: "unity-umm",
    build: (v) =>
      v.RAILLOADER_FILES && v.RAILLOADER_FILES.length
        ? toolBlock({
            title: "Railloader (tool)",
            tool: "Railloader",
            marker: v.RAILLOADER_FILES[0],
            installsTo: ".",
            extra: [
              "Railloader has no working download site at the moment, so Vortex cannot fetch it. " +
                "This installer exists so an archive you already have installs to the right place.",
            ],
          })
        : null,
  },
  {
    fn: "testAssembly",
    engine: ["unity-melon-bepinex", "unity-umm"],
    build: (v) =>
      matchBlock({
        title: "Assembly Replacement Mods",
        lead:
          "Mods that replace a compiled game assembly outright. These overwrite core game files, " +
          "so they conflict with any other mod touching the same assembly.",
        files: v.ASSEMBLY_FILES,
        installsTo: v.ASSEMBLY_PATH === "." ? GAME_FOLDER_PROSE : v.ASSEMBLY_PATH,
        targetIsProse: v.ASSEMBLY_PATH === ".",
        pitfalls: [
          "Assembly replacements cannot be combined with other assembly mods - state this clearly on the mod page.",
          "Shipping an assembly alongside a plugin makes the whole archive install as an assembly mod.",
        ],
      }),
  },
  {
    fn: "testAssets",
    engine: ["unity-melon-bepinex", "unity-umm"],
    build: (v) =>
      matchBlock({
        title: "Asset Replacement Mods",
        lead: "Mods that replace packed Unity asset files, deployed into the game's data folder.",
        exts: v.ASSETS_EXTS,
        installsTo: v.ASSETS_PATH,
        pitfalls: ["Asset files must keep their original names to replace the right bundle."],
      }),
  },

  // ── UE2-3 / TFC ───────────────────────────────────────────────────────────
  {
    fn: "testTfc",
    engine: "ue2-3",
    build: (v) =>
      v.TFC_EXEC
        ? toolBlock({
            title: "TFC Installer (tool)",
            tool: "the TFC Installer",
            marker: v.TFC_EXEC,
          })
        : null,
  },
  {
    fn: "testUpkExplorer",
    engine: "ue2-3",
    build: (v) =>
      v.UPKEXPLORER_EXEC
        ? toolBlock({
            title: "UPK Explorer (tool)",
            tool: "UPK Explorer",
            marker: v.UPKEXPLORER_EXEC,
          })
        : null,
  },
  {
    fn: "testTfcMod",
    engine: "ue2-3",
    build: (v) =>
      matchBlock({
        title: "TFC Mods",
        lead: "Texture/content mods handled through the TFC system.",
        exts: v.TFCMOD_EXTS,
        files: v.TFCMOD_FILES,
        pitfalls: ["Keep the original file names - the TFC system matches them by name."],
      }),
  },
  {
    fn: "testCookedSub",
    engine: "ue2-3",
    build: (v) =>
      matchBlock({
        title: "Cooked Content Mods",
        lead: "Packaged content deployed into the game's cooked content folder.",
        folders: v.COOKEDSUB_FOLDERS,
        exts: v.COOKEDSUB_EXTS,
      }),
  },
  {
    fn: "testMovies",
    engine: ["ue2-3", "cobra-acse"],
    build: (v) =>
      matchBlock({
        title: "Movie / Cutscene Replacements",
        lead: "Replacement video files, deployed into the game's movies folder.",
        exts: v.MOVIES_EXTS,
        pitfalls: [
          "The replacement must keep the original file name, or the game will not pick it up.",
        ],
      }),
  },
  {
    fn: "testBinaries",
    engine: "ue2-3",
    build: (v) =>
      matchBlock({
        title: "Binaries / Injector Mods",
        lead: "DLL injectors and other files that belong next to the game executable.",
        files: v.BINARIES_FILES,
        exts: v.BINARIES_EXTS,
      }),
  },

  // ── RE Engine / Fluffy ────────────────────────────────────────────────────
  {
    fn: "testFluffy",
    engine: "reengine",
    build: (v) =>
      v.FLUFFY_EXEC
        ? toolBlock({
            title: "Fluffy Mod Manager (tool)",
            tool: "Fluffy Mod Manager",
            marker: v.FLUFFY_EXEC,
          })
        : null,
  },
  {
    fn: "testREF",
    engine: "reengine",
    build: (v) =>
      v.REF_FILE
        ? toolBlock({
            title: "REFramework (mod loader)",
            tool: "REFramework",
            marker: v.REF_FILE,
          })
        : null,
  },
  {
    fn: "testLooseLua",
    engine: "reengine",
    build: (v) => {
      const ext = v.LUA_EXT || ".lua";
      return {
        title: "Loose Lua Scripts",
        quick: `a \`${ext}\` file outside the REFramework folders`,
        installsTo: null,
        lead: `Standalone REFramework Lua scripts, shipped without the surrounding REFramework folder structure.`,
        rules: [
          `Recognised by a \`${ext}\` file in an archive that does NOT already contain a REFramework folder` +
            (v.REF_FOLDERS && v.REF_FOLDERS.length ? ` (${orList(v.REF_FOLDERS)}).` : "."),
          "Vortex adds the correct folder structure around the script for you.",
        ],
        pitfalls: [
          "Including an REFramework folder as well switches the archive to a different installer, " +
            "which expects the full structure to already be correct.",
        ],
      };
    },
  },
  {
    fn: "testPreset",
    engine: "reengine",
    build: (v) =>
      matchBlock({
        title: "Preset Files",
        lead: "Configuration presets for REFramework mods.",
        exts: v.PRESET_EXTS,
      }),
  },
  {
    fn: "testFluffyMod",
    engine: "reengine",
    build: () => ({
      title: "Fluffy-Format Mods",
      quick: "anything not matched above",
      installsTo: null,
      lead:
        "The catch-all for RE Engine mods packaged in the normal Fluffy Mod Manager layout. " +
        "Most content mods for this game land here, which is the intended outcome.",
      rules: ["Any archive not claimed by an earlier installer is treated as a Fluffy-format mod."],
      pitfalls: [
        "Because this is a catch-all, a badly laid-out archive still installs - it just may not work. " +
          "Match the layout Fluffy Mod Manager expects.",
      ],
    }),
  },
  {
    // The live half of the reZip pair. testFluffyMod above is its dead twin: the two are
    // registered from opposite arms of `if (!reZip)`, so exactly one of them exists in any
    // given extension, and every current RE Engine game ships reZip = true.
    fn: "testZipContent",
    engine: "reengine",
    build: () => ({
      title: "Fluffy-Format Mods",
      quick: "anything not matched above",
      installsTo: null,
      lead:
        "The catch-all for RE Engine mods packaged in the normal Fluffy Mod Manager layout. " +
        "Most content mods for this game land here, which is the intended outcome.",
      rules: [
        "Any archive not claimed by an earlier installer is treated as a Fluffy-format mod.",
        "An archive already zipped in the Fluffy layout is installed as it is, with no repacking.",
      ],
      pitfalls: [
        "Because this is a catch-all, a badly laid-out archive still installs - it just may not work. " +
          "Match the layout Fluffy Mod Manager expects.",
      ],
    }),
  },

  // ── Anvil (Assassin's Creed etc.) ─────────────────────────────────────────
  {
    fn: "testATK",
    engine: "anvil",
    build: (v) =>
      v.ATK_EXEC
        ? toolBlock({
            title: "AnvilToolkit (tool)",
            tool: "AnvilToolkit",
            marker: v.ATK_EXEC,
          })
        : null,
  },
  {
    fn: "testForger",
    engine: "anvil",
    build: (v) =>
      v.FORGER_EXEC
        ? toolBlock({
            title: "Forger Patch Manager (tool)",
            tool: "Forger Patch Manager",
            marker: v.FORGER_EXEC,
          })
        : null,
  },
  {
    fn: "testReforger",
    engine: "anvil",
    build: () => ({
      title: "ReForger (tool)",
      quick: "nothing - ReForger is not installed as a mod",
      installsTo: null,
      lead:
        "ReForger ships as a Windows app package rather than loose files, so it is installed " +
        "by its own installer instead of being managed as a mod. Vortex downloads the latest " +
        "ReForgerInstaller.exe and runs it for you.",
      rules: [
        "There is nothing for a mod author to package here. Ship your patches alone and list " +
          "ReForger as a requirement.",
      ],
      pitfalls: [],
    }),
  },
  {
    fn: "testForge",
    engine: "anvil",
    build: (v) =>
      matchBlock({
        title: "Forge File Mods",
        lead: "Replacement `.forge` archives, deployed into the game's data folder.",
        exts: v.FORGE_EXTS && v.FORGE_EXTS.length ? v.FORGE_EXTS : v.FORGE_EXT ? [v.FORGE_EXT] : [],
        pitfalls: [
          "Forge files must keep their original names to replace the right archive.",
          ...(v.DLC_FOLDERS && v.DLC_FOLDERS.length
            ? [
                "A forge file belonging to a DLC is routed to that DLC's folder by the `_NN_dlc` " +
                  "segment in its name, so renaming that part of the file name sends it somewhere " +
                  "else. One archive may carry forge files for several DLCs; each is routed on its own.",
              ]
            : []),
        ],
      }),
  },
  {
    fn: "testExtracted",
    engine: "anvil",
    build: (v) =>
      v.EXTRACTED_FOLDER
        ? matchBlock({
            title: "Extracted Forge Content",
            lead:
              "Unpacked forge content for AnvilToolkit to repack. The mod is not live until the " +
              "user runs AnvilToolkit and repacks - deploying it in Vortex only stages the files " +
              "where the toolkit expects them.",
            folders: [v.EXTRACTED_FOLDER],
            pitfalls: [
              "Content unpacked with an AnvilToolkit older than 1.2.8 cannot be repacked by 1.2.8 " +
                "or newer, which affects the pre-Unity titles. Repack on the old version first, " +
                "delete the extracted folder, then unpack again on the new one.",
            ],
          })
        : null,
  },
  {
    fn: "testForgeFolder",
    engine: "anvil",
    build: (v) =>
      v.FORGEFOLDER_STRING
        ? matchBlock({
            title: "Unpacked .forge Folder",
            lead:
              "A whole unpacked `.forge` archive, packaged as a folder named after the archive it " +
              "came from. It is staged under the extracted-content folder for AnvilToolkit to repack.",
            folders: [`<name>${v.FORGEFOLDER_STRING}`],
            pitfalls: [
              "Keep the folder named exactly after the `.forge` archive the content came from, " +
                "extension included. The name is what tells AnvilToolkit which archive to repack into.",
            ],
          })
        : null,
  },
  {
    fn: "testDataFolder",
    engine: "anvil",
    build: (v) =>
      v.DATAFOLDER_STRING
        ? matchBlock({
            title: "Unpacked .data Folder",
            lead:
              "An unpacked `.data` file, packaged as a folder named after it. Nothing in the " +
              "archive says which `.forge` it belongs in, so Vortex stages it under a placeholder " +
              "folder and asks the user to rename that folder to the right `.forge` name.",
            folders: [`<name>${v.DATAFOLDER_STRING}`],
            pitfalls: [
              "Name the `.forge` archive your content belongs in somewhere the user will see it - " +
                "the mod page, a readme, or the archive name. They have to type it into the rename " +
                "prompt, and Vortex cannot work it out from the files.",
            ],
          })
        : null,
  },
  {
    fn: "testLoose",
    engine: "anvil",
    build: (v) =>
      matchBlock({
        title: "Loose Data Files",
        lead:
          "Individual data files, staged under a placeholder folder for the user to rename to the " +
          "`.forge` archive they belong in, the same way an unpacked `.data` folder is.",
        exts: v.LOOSE_EXTS,
        pitfalls: [
          "State which `.forge` archive the files belong in. The user is prompted for that name " +
            "and has nothing else to go on.",
        ],
      }),
  },
  {
    fn: "testForgerPatch",
    engine: "anvil",
    build: (v) =>
      matchBlock({
        title: "Forger Patches",
        lead: "Patch files for Forger Patch Manager to apply.",
        exts: v.FORGER_EXTS,
        pitfalls: [
          "These are applied through Forger Patch Manager, not deployed into the game directly - " +
            "installing in Vortex alone does not change the game.",
        ],
      }),
  },
  {
    fn: "testPatchTextures",
    engine: "anvil",
    build: (v) =>
      matchBlock({
        title: "Forger Patch Textures",
        lead: "Loose textures applied as a Forger patch.",
        exts: v.PATCH_TEXTURES_EXTS,
        pitfalls: [
          "Textures have to keep the names the game uses; a renamed file replaces nothing.",
        ],
      }),
  },
  {
    fn: "testResoRep",
    engine: "anvil",
    build: (v) =>
      v.RESOREP_DLL_FILE
        ? toolBlock({
            title: "ResoRep (tool)",
            tool: "ResoRep",
            marker: v.RESOREP_DLL_FILE,
            extra: [
              "Vortex downloads the matching ResoRep package and writes its settings file, " +
                "so this installer normally only ever runs on that automatic download.",
            ],
          })
        : null,
  },
  {
    fn: "testResoRepTextures",
    engine: "anvil",
    build: (v) =>
      matchBlock({
        title: "ResoRep Textures",
        lead:
          "Replacement textures injected at runtime by ResoRep, rather than packed back into a " +
          "`.forge` archive.",
        exts: v.RESOREP_TEXTURES_EXTS,
        pitfalls: [
          "ResoRep must be installed and its DLL in place for these to show up in game; the " +
            "textures alone do nothing.",
          "Each texture has to keep the name ResoRep dumped it under, or it replaces nothing.",
        ],
      }),
  },
  {
    fn: "testSound",
    engine: "anvil",
    build: (v) =>
      matchBlock({
        title: "Sound Banks",
        lead: "Replacement sound bank files, deployed into the game's sound data folder.",
        exts: v.SOUND_EXTS,
        pitfalls: ["Sound banks must keep their original names to replace the right bank."],
      }),
  },
  {
    fn: "testFixes",
    engine: "anvil",
    build: (v) =>
      matchBlock({
        title: "Fixes Package",
        lead: "A community fixes package, deployed into the game folder.",
        files: v.FIXES_FILES,
      }),
  },
  {
    fn: "testIndividualBuildtables",
    game: "game-ghostreconbreakpoint",
    build: (v) =>
      v.BUILDTABLE_FOLDER && v.BUILDTABLE_EXTS && v.BUILDTABLE_EXTS.length
        ? matchBlock({
            title: "Individual Buildtables",
            lead:
              "Loose buildtable files, kept in their own folder so several mods can supply one " +
              "each without overwriting one another.",
            folders: [v.BUILDTABLE_FOLDER],
            exts: v.BUILDTABLE_EXTS,
            pitfalls: [
              "Both are required: the archive needs the named folder AND at least one buildtable " +
                "file inside it. A bare buildtable file with no folder around it is not recognised.",
            ],
          })
        : null,
  },
  {
    fn: "testDlc",
    engine: "anvil",
    build: (v) =>
      v.DLC_FOLDERS && v.DLC_FOLDERS.length
        ? matchBlock({
            title: "DLC Folder Mods",
            lead:
              "Mods laid out as one or more of the game's DLC folders, copied into the game folder " +
              "with that layout intact.",
            folders: v.DLC_FOLDERS,
            pitfalls: [
              "Zip the DLC folders themselves, not the folder that contains them - an extra level " +
                "misplaces every file.",
            ],
          })
        : null,
  },

  // ── Frostbite ─────────────────────────────────────────────────────────────
  {
    fn: "testFrosty",
    engine: "frostbite",
    build: (v) =>
      v.FROSTY_EXEC
        ? toolBlock({
            title: "Frosty Mod Manager (tool)",
            tool: "Frosty Mod Manager",
            marker: v.FROSTY_EXEC,
          })
        : null,
  },
  {
    fn: "testFbmod",
    engine: "frostbite",
    build: (v) =>
      matchBlock({
        title: "Frosty Mods",
        lead:
          "Frostbite mods in Frosty Mod Manager format. Vortex stages them for Frosty rather than " +
          "deploying them into the game directly.",
        exts: v.FROSTYMOD_EXTS,
        pitfalls: [
          "These mods still have to be applied through Frosty Mod Manager - installing in Vortex alone does not patch the game.",
        ],
      }),
  },

  // ── Far Cry ───────────────────────────────────────────────────────────────
  {
    fn: "testModInstaller",
    engine: "farcry",
    build: (v) =>
      v.MI_FILE
        ? toolBlock({
            title: "Mod Installer (tool)",
            tool: "the Far Cry Mod Installer",
            marker: v.MI_FILE,
          })
        : null,
  },
  {
    fn: "testData",
    engine: ["farcry", "srmm"],
    build: (v) =>
      matchBlock({
        title: "Data File Mods",
        lead: "Packed game data replacements.",
        exts: v.DATA_EXTS,
      }),
  },
  {
    fn: "testMiMod",
    engine: "farcry",
    build: (v) =>
      matchBlock({
        title: "Mod Installer Mods",
        lead: "Mods packaged for the Far Cry Mod Installer.",
        exts: v.MIMOD_EXTS,
        pitfalls: [
          "These are applied through the Mod Installer tool, not deployed straight into the game.",
        ],
      }),
  },

  // ── Reloaded-II ───────────────────────────────────────────────────────────
  {
    fn: "testModManger",
    engine: "reloaded2",
    build: (v) =>
      v.RELOADED_EXEC
        ? toolBlock({
            title: "Reloaded-II (mod loader)",
            tool: "Reloaded-II",
            marker: v.RELOADED_EXEC,
          })
        : null,
  },

  // ── Cobra Engine / ACSE ───────────────────────────────────────────────────
  {
    fn: "testACSE",
    engine: "cobra-acse",
    build: (v) =>
      v.ACSE_FILE
        ? toolBlock({
            title: "ACSE (mod loader)",
            tool: "ACSE",
            marker: v.ACSE_FILE,
          })
        : null,
  },
  {
    fn: "testAcseMod",
    engine: "cobra-acse",
    build: (v) =>
      v.ACSE_MOD_FILE
        ? matchBlock({
            title: "ACSE Mods",
            lead: "Lua mods that run under ACSE.",
            files: [v.ACSE_MOD_FILE],
            pitfalls: [
              `The archive must contain \`${v.ACSE_MOD_FILE}\` - ACSE identifies mods by that file.`,
            ],
          })
        : null,
  },
  {
    fn: "testOvlData",
    engine: "cobra-acse",
    build: (v) =>
      v.OVLDATA_FILE
        ? matchBlock({
            title: "OVL Data Mods",
            lead: "Packed Cobra Engine content.",
            files: [v.OVLDATA_FILE],
          })
        : null,
  },

  // ── Shared across the non-Unreal engines ──────────────────────────────────
  {
    fn: "testRoot",
    engine: NON_UE_ENGINES,
    build: (v) => {
      const folders = [...(v.ROOT_FOLDERS || []), ...(v.ROOTSUB_FOLDERS || [])];
      const block = matchBlock({
        title: "Root / Game Folder Mods",
        lead:
          "For mods laid out the same way the files appear inside the game folder. " +
          "Vortex copies the matched folder and everything under it straight into the game.",
        folders,
        files: v.ROOT_FILES,
        exts: v.ROOT_EXTS,
        installsTo: GAME_FOLDER_PROSE,
        targetIsProse: true,
        pitfalls: [
          "Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, " +
            "adds an extra level and misplaces every file.",
        ],
      });
      if (block && folders.length) {
        block.tree = [
          "MyRootMod.zip",
          `└── ${folders[0]}\\`,
          "    └── ... files in their real relative locations",
        ].join("\n");
      }
      return block;
    },
  },
  {
    fn: "testSave",
    engine: NON_UE_ENGINES,
    build: (v) =>
      matchBlock({
        title: "Save Game Files",
        lead: "Save files, deployed to the game's save folder.",
        userProfile: true,
        exts: v.SAVE_EXTS,
        files: v.SAVE_FILES,
        pitfalls: [
          "Including an example save alongside a normal mod makes the archive install as a save.",
        ],
      }),
  },
  {
    fn: "testConfig",
    engine: NON_UE_ENGINES,
    build: (v) =>
      matchBlock({
        title: "Config File Mods",
        lead: "Configuration tweaks, deployed to the game's config location.",
        userProfile: true,
        files: v.CONFIG_FILES,
        exts: v.CONFIG_EXTS,
        installsTo: v.CONFIG_PATH,
        pitfalls: [
          "Shipping a config file with one of these names inside an unrelated mod makes the whole " +
            "archive install as a config mod.",
        ],
      }),
  },
  {
    fn: "testFallback",
    engine: NON_UE_ENGINES,
    build: (v) => ({
      title: "Fallback Installer",
      quick: "anything not matched above",
      installsTo: v.FALLBACK_PATH,
      lead:
        "The catch-all. Any archive that matched none of the installers above lands here and is " +
        "copied across unchanged.",
      rules: [
        "Reaching this installer usually means the archive was not laid out in a way Vortex recognised.",
        "Vortex shows the user a notification when a mod installs through the fallback.",
      ],
      pitfalls: [
        "If your mod lands here unintentionally, re-check the layouts above - users will see a " +
          "fallback warning and may report the mod as broken.",
      ],
      warn: "Landing in the fallback installer is a signal your archive layout needs fixing.",
    }),
  },
];

/**
 * Mod loaders a Unity extension offers, as a subset of ["bep", "mel"], from the loader
 * constants it declares. MelonLoader is Unity-only, so an XNA game never offers it. With
 * loaderChoice off the extension only ever installs recommendedLoader ("bep"/"bepinex" or
 * "mel"/"melon"), so the other loader is left out.
 */
function unityLoaders(v) {
  const out = [];
  if (v.BEPINEX_FOLDER) out.push("bep");
  if (v.MELON_FOLDER && v.isXna !== "true") out.push("mel");
  if (v.loaderChoice === "false") {
    const rec = String(v.recommendedLoader || "").toLowerCase();
    const only = rec.startsWith("bep") ? "bep" : rec.startsWith("mel") ? "mel" : null;
    if (only && out.includes(only)) return [only];
  }
  return out;
}

/** Resolve every constant the UE4-5 prose blocks reference. */
function buildVars(src, table) {
  const v = {};
  for (const n of [
    "EPIC_CODE_NAME",
    "LOGICMODS_FOLDER",
    "PAK_EXT",
    "SCRIPTS_FOLDER",
    "SCRIPTS_EXT",
    "DLL_FOLDER",
    "DLL_EXT",
    "UE4SS_FILE",
    "SIGBYPASS_DLL",
    "SIGBYPASS_LUA",
    "MODKITMOD_FILE",
    "MODKITMOD_EXT",
    "CONFIG_PATH",
    // Unity (BepInEx / MelonLoader)
    "BEPINEX_FOLDER",
    "BEPINEX_DLL_FILE",
    "BEPINEX_MOD_PATH",
    "MELON_FOLDER",
    "MELON_DLL_FILE",
    "MELON_MODS_PATH",
    "BEPCFGMAN_FILE",
    "BEPCFGMAN_PATH",
    "MELONPREFMAN_FILE",
    "MELONPREFMAN_PATH",
    "ASSEMBLY_PATH",
    "ASSETS_PATH",
    "PLUGIN_PATH",
    "BEPINEX_PLUGINS_PATH",
    "BEPINEX_PATCHERS_PATH",
    "BEP_PATCHER_STRING",
    "MELON_MOD_PATH",
    "MELON_PLUGINS_PATH",
    "MEL_PLUGIN_STRING",
    "loaderChoice",
    "recommendedLoader",
    "isXna",
    "preventPluginInstall",
    // Unity (Jiangyu - MENACE)
    "JIANGYU_FILE",
    "JIANGYU_PATH",
    "JIANGYUMOD_FILE",
    "JIANGYUMOD_PATH",
    // Unity (Unity Mod Manager / Railloader)
    "UMM_INST_EXEC",
    "UMM_MOD_FILE",
    "MODS_FOLDER",
    "RAILLOADER_MOD_FILE",
    // UE2-3 / TFC
    "TFC_EXEC",
    "UPKEXPLORER_EXEC",
    // RE Engine / Fluffy
    "FLUFFY_EXEC",
    "REF_FILE",
    "LUA_EXT",
    // Anvil
    "ATK_EXEC",
    "EXTRACTED_FOLDER",
    "FORGEFOLDER_STRING",
    "DATAFOLDER_STRING",
    "FORGE_EXT",
    "FORGER_EXEC",
    "RESOREP_DLL_FILE",
    "BUILDTABLE_FOLDER",
    // Frostbite
    "FROSTY_EXEC",
    // Far Cry
    "MI_FILE",
    // Reloaded-II
    "RELOADED_EXEC",
    // Cobra / ACSE
    "ACSE_FILE",
    "ACSE_MOD_FILE",
    "OVLDATA_FILE",
    // Godot
    "MAPS_PATH",
    "MAPS_FOLDER",
  ]) {
    v[n] = val(n, src, table);
  }
  for (const n of [
    "UE4SS_SUBFOLDERS",
    "ROOT_FOLDERS",
    "ROOTSUB_FOLDERS",
    "CONTENTSUB_FOLDERS",
    "CONFIG_FILES",
    "CONFIG_EXTS",
    "SAVE_EXTS",
    "SAVE_FILES",
    "PAKMOD_EXTS",
    "ASSEMBLY_FILES",
    "ASSETS_EXTS",
    "PLUGIN_EXTS",
    "ROOT_FILES",
    "ROOT_EXTS",
    "TFCMOD_EXTS",
    "TFCMOD_FILES",
    "COOKEDSUB_FOLDERS",
    "COOKEDSUB_EXTS",
    "MOVIES_EXTS",
    "BINARIES_FILES",
    "BINARIES_EXTS",
    "PRESET_EXTS",
    "REF_FOLDERS",
    "LOOSE_EXTS",
    "FORGE_EXTS",
    "FORGER_EXTS",
    "PATCH_TEXTURES_EXTS",
    "RESOREP_TEXTURES_EXTS",
    "SOUND_EXTS",
    "FIXES_FILES",
    "DLC_FOLDERS",
    "BUILDTABLE_EXTS",
    "FROSTYMOD_EXTS",
    "DATA_EXTS",
    "MIMOD_EXTS",
    "RAILLOADER_FILES",
    "MAPS_EXTS",
    "BEPINEX_MOD_FOLDERS",
    "MELON_MOD_FOLDERS",
  ]) {
    v[n] = resolveArray(n, src, table);
  }
  // Older/simpler extensions use singular names instead of the plural arrays.
  const singularFallbacks = [
    ["SAVE_EXTS", "SAVE_EXT"],
    ["ROOT_FOLDERS", "ROOT_FOLDER"],
    ["ASSEMBLY_FILES", "ASSEMBLY_FILE"],
    ["PLUGIN_EXTS", "PLUGIN_EXT"],
    ["ASSETS_EXTS", "ASSETS_EXT"],
    ["MOVIES_EXTS", "MOVIES_EXT"],
    ["DATA_EXTS", "DATA_EXT"],
    ["CONFIG_FILES", "CONFIG_FILE"],
    ["CONFIG_EXTS", "CONFIG_EXT"],
    ["SAVE_FILES", "SAVE_FILE"],
    ["FORGE_EXTS", "FORGE_EXT"],
    ["FORGER_EXTS", "FORGER_EXT"],
    ["SOUND_EXTS", "SOUND_EXT"],
    ["PATCH_TEXTURES_EXTS", "PATCH_TEXTURES_EXT"],
    ["RESOREP_TEXTURES_EXTS", "RESOREP_TEXTURES_EXT"],
    ["FIXES_FILES", "FIXES_FILE"],
    ["BUILDTABLE_EXTS", "BUILDTABLE_EXT"],
  ];
  for (const [arrName, scalarName] of singularFallbacks) {
    if (!v[arrName] || !v[arrName].length) {
      const single = val(scalarName, src, table);
      if (single) {
        v[arrName] = [single];
      } else {
        // A singular name can also hold an array literal (CONFIG_FILE = [A, B]).
        const arr = resolveArray(scalarName, src, table);
        if (arr.length) v[arrName] = arr;
      }
    }
  }
  // CONFIG_EXTS and SAVE_FILES are only documented when the installer's own test function
  // reads them. A declared-but-unused constant must not turn into a claim about what the
  // installer recognises.
  const readBy = (fn, names) => {
    const body = sliceFunction(src, fn);
    return !!body && names.some((n) => new RegExp(`\\b${n}\\b`).test(body));
  };
  if (!readBy("testConfig", ["CONFIG_EXTS", "CONFIG_EXT"])) v.CONFIG_EXTS = [];
  if (!readBy("testSave", ["SAVE_FILES", "SAVE_FILE"])) v.SAVE_FILES = [];
  // Loader marker files are named inconsistently across the Unity extensions.
  if (!v.BEPINEX_DLL_FILE) v.BEPINEX_DLL_FILE = val("BEPINEX_FILE", src, table);
  if (!v.MELON_DLL_FILE) v.MELON_DLL_FILE = val("MELON_FILE", src, table);
  v.LOADERS = unityLoaders(v);
  v.WRAPS_PLUGINS = /\bfunction\s+pluginFolderName\b/.test(src);
  v.MELON_MANIFEST = /\bfunction\s+melonManifest\b/.test(src);
  // A fallback copy without a setmodtype instruction deploys to the game's default mod path
  // (registerGame modPath), which is not always the game folder.
  const fallbackBody = sliceFunction(src, "installFallback");
  const defaultPath = val("MOD_PATH_DEFAULT", src, table);
  v.FALLBACK_PATH =
    fallbackBody && !/setmodtype/.test(fallbackBody) && defaultPath && !/^\.?\/?$/.test(defaultPath)
      ? defaultPath
      : null;
  // PAKMOD_EXTS is built as ['.pak'].concat(PAKMOD_EXTRA_EXTS)
  if (!v.PAKMOD_EXTS.length) {
    const extra = resolveArray("PAKMOD_EXTRA_EXTS", src, table);
    v.PAKMOD_EXTS = [".pak", ...extra];
  }
  // Legacy Unreal extensions keep their pak settings on an UNREALDATA object.
  // `fileExt` is usually a reference to an array constant rather than a literal.
  v.UNREAL_MODS_PATH = val("UNREALDATA.modsPath", src, table);
  v.UNREAL_FILE_EXTS = resolveObjArray("UNREALDATA", "fileExt", src, table);
  // Deploy targets. These resolve far more often than spec.modTypes targetPath,
  // which is frequently a function rather than a literal.
  for (const n of ["PAKMOD_PATH", "SCRIPTS_PATH", "DLL_PATH", "BINARIES_PATH", "LOGICMODS_PATH"]) {
    v[n] = val(n, src, table);
  }
  // An Xbox release whose getExecutable moves BINARIES_PATH to Binaries\WinGDK.
  v.XBOX_WINGDK =
    isRealValue(val("XBOXAPP_ID", src, table)) &&
    /\bBINARIES_PATH\s*=\s*path\.join\([^)]*\bEXEC_FOLDER_XBOX\b/.test(src);
  // Block rules print these paths directly, so they get the same clean-up as deploy targets.
  for (const n of Object.keys(v)) {
    if (/_PATH$/.test(n) && typeof v[n] === "string") v[n] = cleanTarget(v[n], src);
  }
  return v;
}

// ── tier 2: derive the trigger from the test function body ──────────────────

/**
 * Slice a top-level function body out of the source. Brace counting is unsafe
 * here because regex and string literals in these files contain unbalanced
 * braces, so the next top-level `function` declaration is used as the delimiter.
 */
function sliceFunction(src, name) {
  // Top-level declaration: `function testX(` / `async function testX(`
  const declRe = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, "m");
  let m = declRe.exec(src);
  if (m) {
    const rest = src.slice(m.index + m[0].length);
    const nm = /^(?:async\s+)?function\s+\w+\s*\(/m.exec(rest);
    return nm ? rest.slice(0, nm.index) : rest;
  }
  // Arrow assigned to a const/let, often nested inside main():
  //   const testForUnrealMod = (files, gameId) => { ... };
  const arrowRe = new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*(?:async\\s*)?\\(`, "");
  m = arrowRe.exec(src);
  if (m) {
    const rest = src.slice(m.index + m[0].length);
    // Delimit on the next sibling declaration or top-level function.
    const nm = /(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\(|^(?:async\s+)?function\s+\w+\s*\(/m.exec(
      rest,
    );
    return nm ? rest.slice(0, nm.index) : rest;
  }
  return null;
}

/** Index of the `)` closing the `(` at `open`, skipping string literals; -1 when unbalanced. */
function matchingParen(body, open) {
  let depth = 0;
  for (let i = open; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = body.indexOf(ch, i + 1);
      if (i === -1) return -1;
    } else if (ch === "(") {
      depth++;
    } else if (ch === ")" && --depth === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Character ranges of `files.some/find(...)` checks that only count AGAINST a match, either
 * written inline as `!files.some(...)` or bound to a flag the body only ever reads negated
 * (`const isExe = files.some(...)` ... `&& !isExe`). A "must not contain" check is not something
 * the archive has to contain, so deriveTrigger leaves these ranges out.
 */
function negatedRanges(body) {
  const ranges = [];
  for (const m of body.matchAll(/(!+)\s*files\.(?:some|find)\s*\(/g)) {
    if (m[1].length % 2 === 0) continue;
    const open = m.index + m[0].length - 1;
    const close = matchingParen(body, open);
    if (close !== -1) ranges.push([open, close]);
  }
  for (const m of body.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*files\.(?:some|find)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const close = matchingParen(body, open);
    if (close === -1) continue;
    const uses = [...body.slice(close).matchAll(new RegExp(`(!*)\\s*\\b${m[1]}\\b`, "g"))];
    if (uses.length && uses.every((u) => u[1].length % 2 === 1)) ranges.push([open, close]);
  }
  return ranges;
}

/**
 * Phrase a basename match. A name with an extension is a file and one without is a folder;
 * only a list mixing the two keeps the generic wording.
 */
function namedMarker(names) {
  const hasExt = (n) => /\.[A-Za-z0-9]+$/.test(n);
  if (names.every(hasExt)) return `a ${orList(names)} file`;
  if (!names.some(hasExt)) return `a ${orList(names)} folder`;
  return `a file or folder named ${orList(names)}`;
}

/**
 * Read the recognisable file/folder conditions out of a test function body.
 * Returns human-readable phrases; unrecognised logic simply yields nothing,
 * so the section degrades to a bare priority note rather than saying anything false.
 */
function deriveTrigger(body, src, table) {
  const out = [];
  const seen = new Set();
  // A template placeholder left in a game's source (`XXX.dll`) is not something to tell users to ship.
  const add = (s) => {
    if (s && !seen.has(s) && (documentingTemplate || !s.includes("XXX"))) {
      seen.add(s);
      out.push(s);
    }
  };
  const negated = negatedRanges(body);
  const isNegated = (idx) => negated.some(([from, to]) => idx > from && idx < to);

  // path.basename(...) === CONST  ->  file or folder with that name. The name stops before a
  // trailing `.toLowerCase()`, which would otherwise be read as part of the constant.
  for (const m of body.matchAll(
    /path\.basename\([^)]*\)(?:\.toLowerCase\(\))?\s*===\s*([A-Za-z_$][\w$]*(?:\.(?!toLowerCase\()[A-Za-z_$][\w$]*)*|'[^']*'|"[^"]*")(?:\.toLowerCase\(\))?/g,
  )) {
    const raw = m[1];
    if (/^(gameId|spec)/.test(raw) || isNegated(m.index)) continue;
    const value = resolveWithFallback(raw, table, src);
    if (value && value !== raw && !String(value).includes("${") && value !== "moduleconfig.xml") {
      add(namedMarker([value]));
    }
  }
  // path.extname(...) === CONST  ->  file with that extension
  for (const m of body.matchAll(
    /path\.extname\([^)]*\)(?:\.toLowerCase\(\))?\s*===\s*([A-Za-z_$][\w$]*(?:\.(?!toLowerCase\()[A-Za-z_$][\w$]*)*|'[^']*'|"[^"]*")/g,
  )) {
    if (isNegated(m.index)) continue;
    const value = resolveWithFallback(m[1], table, src);
    if (value && value !== m[1] && !String(value).includes("${")) {
      add(`a \`${value}\` file`);
    }
  }
  // ARRAY.includes(path.basename/extname(...))
  for (const m of body.matchAll(
    /([A-Z][A-Z0-9_]*)(?:_LOWER)?\.includes\(\s*path\.(basename|extname)\(/g,
  )) {
    if (isNegated(m.index)) continue;
    const arrName = m[1].replace(/_LOWER$/, "");
    const items = resolveArray(arrName, src, table);
    if (items.length) {
      add(m[2] === "extname" ? `a ${orList(items)} file` : namedMarker(items));
    }
  }
  // `a ".glb" file and a ".glb" or ".dat" file`: an alternative that one of the required items
  // already satisfies adds nothing.
  return out.filter((s) => {
    const m = /^a (`[^`]+`(?:, `[^`]+`)* or `[^`]+`) (file|folder)$/.exec(s);
    if (!m) return true;
    return !m[1].match(/`[^`]+`/g).some((opt) => out.includes(`a ${opt} ${m[2]}`));
  });
}

/**
 * The mod type an install function assigns through its `setmodtype` instruction, or null when
 * it sets none, sets the default type, or picks between several - a conditional choice cannot
 * be reduced to one target.
 */
function setModTypeOf(src, fn, table) {
  const body = fn ? sliceFunction(src, fn) : null;
  if (!body) return null;
  const ids = new Set();
  for (const m of body.matchAll(
    /type:\s*["']setmodtype["']\s*,\s*value:\s*([A-Za-z_$][\w$.]*|`[^`]*`|'[^']*'|"[^"]*")/g,
  )) {
    const id = resolveWithFallback(m[1], table, src);
    if (!id || String(id).includes("${")) return null;
    ids.add(String(id));
  }
  return ids.size === 1 ? [...ids][0] : null;
}

// ── rendering ───────────────────────────────────────────────────────────────

const SEP = "=".repeat(72);

/** Format a deploy target: real paths get code formatting, prose does not. */
function fmtTarget(s) {
  if (!s.target) return "-";
  const t = String(s.target);
  // '.' is the game folder root; showing it as a path is meaningless.
  if (s.targetIsProse || t === GAME_FOLDER_PROSE || t === ".") {
    return t === "." ? GAME_FOLDER_PROSE : t;
  }
  return `\`${disp(t)}\``;
}

/** Suffix for a target under Binaries\Win64 on a game whose Xbox build uses WinGDK. */
function xboxNote(s) {
  return s.xboxWinGdk ? " (`WinGDK` instead of `Win64` for the Xbox version)" : "";
}

function renderMarkdown(ctx) {
  const { title, gameName, sections, fallbackNote } = ctx;
  let md = `# ${title}\n\n`;
  md += `Packaging rules for ${gameName} mods, so Vortex installs them to the right place.\n\n`;
  md +=
    `Vortex decides what a mod is by looking at the files and folders inside the archive. ` +
    `It tries each installer in order and the first one that matches wins, so archive layout is what ` +
    `determines where your mod ends up.\n\n`;
  md += `## Quick Reference\n\n`;
  if (!sections.length) {
    // No installer: an empty table would say nothing.
    md += NO_INSTALLER_LINE;
  } else {
    md += `| Mod Type | Archive must contain | Installs to |\n| --- | --- | --- |\n`;
    for (const s of sections) {
      md += `| ${s.title} | ${s.quickTrigger || "-"} | ${fmtTarget(s)} |\n`;
    }
    md += `\nPaths are relative to the game's install folder.`;
  }
  // Only mention the user-profile exception when a mod type actually deploys there. Games
  // with no config or save mod type were being told about a rule that does not apply to them.
  if (sections.some((s) => s.userProfile)) {
    md +=
      ` Config and save mods deploy into your ` +
      `user profile instead, so no game-relative path is shown for them.`;
  }
  md += `\n\n`;

  for (const s of sections) {
    md += `## ${s.title}\n\n`;
    if (s.lead) md += `${s.lead}\n\n`;
    if (s.warn) md += `> **NOTE:** ${s.warn}\n\n`;
    if (s.tree) md += `\`\`\`text\n${s.tree}\n\`\`\`\n\n`;
    if (s.rules && s.rules.length) {
      md += `**Requirements:**\n\n`;
      for (const r of s.rules) md += `- ${r}\n`;
      md += `\n`;
    }
    if (s.target) md += `Installs to: ${fmtTarget(s)}${xboxNote(s)}\n\n`;
    if (s.pitfalls && s.pitfalls.length) {
      md += `**Common mistakes:**\n\n`;
      for (const p of s.pitfalls) md += `- ${p}\n`;
      md += `\n`;
    }
  }

  md += `## Rules That Apply To Every Mod Type\n\n`;
  if (ctx.allFomodGuarded) {
    md +=
      `- Archives that contain a FOMOD installer (a \`fomod\` folder with \`ModuleConfig.xml\`) are handed to ` +
      `Vortex's built-in FOMOD installer instead, and none of the rules above apply.\n`;
  }
  md += `- Folder and file name matching is case-insensitive.\n`;
  md += `- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.\n`;
  if (fallbackNote) md += `- ${fallbackNote}\n`;
  md += `\n`;
  // Collapse to a single trailing newline -- every section above ends with its own
  // blank-line separator, so the last one leaves a stray double-blank at EOF.
  return md.replace(/\n+$/, "\n");
}

function renderBBCode(ctx) {
  const { title, gameName, sections } = ctx;
  const L = [];
  L.push(`[b][color=#e69138][size=4]${title}[/size]`);
  L.push(
    `[/color][/b]Packaging rules for ${gameName} mods, so Vortex installs them to the right place.`,
  );
  L.push("");
  L.push(
    "Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.",
  );
  L.push("");
  L.push(SEP);
  L.push("");
  if (!sections.length) {
    L.push(NO_INSTALLER_LINE);
    L.push("");
  }

  for (const s of sections) {
    L.push(`${s.title}:`);
    if (s.lead) {
      L.push("");
      L.push(stripMd(s.lead));
    }
    if (s.warn) {
      L.push("");
      L.push(`[b][color=#ffff00]NOTE: ${stripMd(s.warn)}[/color][/b]`);
    }
    if (s.tree) {
      L.push("");
      L.push("[code]");
      L.push(s.tree);
      L.push("[/code]");
    }
    if (s.rules && s.rules.length) {
      L.push("");
      L.push("  Requirements:");
      for (const r of s.rules) L.push(`    - ${stripMd(r)}`);
    }
    if (s.target) {
      L.push("");
      L.push(`  Installs to: ${stripMd(fmtTarget(s) + xboxNote(s))}`);
    }
    if (s.pitfalls && s.pitfalls.length) {
      L.push("");
      L.push("  Common mistakes:");
      for (const p of s.pitfalls) L.push(`    - ${stripMd(p)}`);
    }
    L.push("");
    L.push(SEP);
    L.push("");
  }

  L.push("Rules That Apply To Every Mod Type:");
  L.push("");
  if (ctx.allFomodGuarded) {
    L.push(
      '    - Archives containing a FOMOD installer (a "fomod" folder with ModuleConfig.xml) are handed to the built-in FOMOD installer instead.',
    );
  }
  L.push("    - Folder and file name matching is case-insensitive.");
  L.push("    - Extra wrapper folders around a recognised folder are generally fine.");
  L.push("");
  return L.join("\n");
}

/** BBCode has no inline code span - drop markdown backticks and bold. */
function stripMd(s) {
  return String(s).replace(/`/g, '"').replace(/\*\*/g, "");
}

/**
 * `a "info.json" file` reads badly - fix the article ahead of a vowel sound.
 * `u` is excluded on purpose: every u-initial token these lines carry is a
 * consonant sound ("a UnityModManager.exe file", "a UE4SS folder").
 */
function fixArticle(s) {
  return String(s).replace(/\ba (?=["']?[aeioAEIO])/g, "an ");
}

/**
 * One line per installer, for the "Mod Installation Notes" list on a Nexus mod page.
 * Same sections the notes are built from, collapsed to trigger + destination:
 *   [*]UE4SS Script mods with a ".lua" file install to the "Mods" folder.[/*]
 *   [*]UE4SS installs to the "Win64" folder, recognised by a "dwmapi.dll" file.[/*]
 * Each line opens with the mod type, the registered mod type's display name (see modTypeNoun),
 * or with the tool's name for a loader/manager installer.
 * Loader installers (the ones whose section carries a tool lead) are marked so the
 * author can move them to the top of the list, where the house style puts them.
 */
const DESCRIPTION_FILE = "DESCRIPTION.bbcode";
const INSTALL_HEADING = "[b]🛠️ Mod Installation Notes:[/b]";
const SUPPORTED_HEADING = "[b]✅ Supported Versions:[/b]";

/** A registered mod type name that ends in a tool word names a tool, not a kind of mod. */
const TOOL_TYPE_NAME = /\b(loader|manager|launcher|injector|installer|extractor|editor|patcher)$/i;

/**
 * Description labels for installers whose mod type the parser cannot name: the mod type is not
 * registered under the installer's id (or is registered in a way the parser misses), and the
 * section title is a mangled installer id ("Zipmod", "Masseffectandromeda Fbmod"). Keyed by the
 * full installer id; wins over the registered mod type name. A string is the mod type's name, as
 * in `<name> mods with ... install to ...`. `{ tool: "Name" }` marks a loader/manager installer,
 * worded `Name installs to ..., recognised by ...`. Take names from the extension's own *_NAME constants.
 */
const MOD_TYPE_LABELS = {
  "ageofmythologyretold-reshade": "ReShade",
  "alanwake2-folders": "Game Data",
  "alienisolation-datafolder": "Data Folder",
  "bloodborne-flver": { tool: "FLVER Editor" },
  "bloodborne-shadlauncher": { tool: "shadPS4 Qt Launcher" },
  "bloodborne-smithbox": { tool: "Smithbox" },
  "crimsondesert-json": "JSON",
  "crimsondesert-specialpatchmod": "Special Patch",
  "crimsondesert-texture": "Texture",
  "darkmessiahofmightandmagic-unlimited": "Unlimited Edition",
  "darktide-root": "Root Folder",
  "deadrisingdeluxeremaster-looselua": "Loose Lua Script",
  "doom3bfgedition-root": "Root Folder",
  "doometernal-ktde": "Keep The Dead Eternal",
  "doometernal-meathook": { tool: "Meath00k" },
  "doometernal-rollback": "Version Rollback",
  "doometernal-zip-mod": "Nested Archive",
  "doomthedarkages-zipmod": "Nested Archive",
  "dragonageinquisition-daimodmanager": { tool: "DAI Mod Manager" },
  "dragonballsparkingzero-modloader": { tool: "SZModLoader" },
  "dragonballsparkingzero-modloadermod": "SZModLoader Plugin",
  "farcry3-ziggy": "Ziggy's",
  "farmingsimulator25-zip": "Nested Archive",
  "ghostreconwildlands-forgemod": "Forge",
  "gzdoom-zipmod": "Nested Archive",
  "helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE":
    "Patch",
  "kingdomcomedeliverance2-cfg": "CFG",
  "masseffectandromeda-fbmod": "Frosty",
  "ninjagaiden3razorsedge-steammodloader": { tool: "Essential Files for NG3RE" },
  "ninjagaidensigma-steammodloader": { tool: "Essential Files for NGS1" },
  "ninjagaidenmastercollection-databinsubfolder23": "Databin Subfolder",
  "ninjagaidensigma2-steammodloader": { tool: "Essential Files for NGS2" },
  "prey2017-chairmodzip": "Chairloader",
  "redfactionguerrillaremarstered-managerlegacy": { tool: "Mod Manager" },
  "residentevil5goldedition-root": "Root Folder",
  "residentevil7-looselua": "Loose Lua Script",
  "roadtovostok-mod-rezip": "Godot",
  "robocoproguecity-binaries": "Binaries (Engine Injector)",
  "robocoproguecity-config": "Config",
  "robocoproguecity-save": "Save",
  "robocoproguecity-scripts": "UE4SS Script",
  "robocoproguecity-ue4ss": "UE4SS",
  "robocoproguecity-ue4ssdll": "UE4SS DLL",
  "robocoproguecity-ue5-sortable-modtype": "UE Sortable Pak",
  "selaco-binaries": "Binaries",
  "streetfighter6-looselua": "Loose Lua Script",
  "systemshock2-classicmod": "Classic",
  "systemshock225thanniversaryremaster-rootfolder": "Root Folder",
  "thelastofuspart1-buildfolderpakbin": "Build Folder",
  "thelastofuspart2-buildfolderpakbin": "Build Folder",
  "warhammer40000darkheresy-modfinder": { tool: "Modfinder" },
  "warhammer40000darkheresy-portraitmanager": { tool: "Portrait Manager" },
  "warhammer40000darkheresy-saveeditor": { tool: "Arcemi Save Editor" },
  "warhammer40kdarktide-dmfdml": { tool: "Darktide Mod Loader" },
  "warhammer40kdarktide-mod": "Darktide",
  "warhammer40kroguetrader-modfinder": { tool: "Modfinder" },
  "warhammer40kroguetrader-portraitmanager": { tool: "Portrait Manager" },
  "warhammer40kroguetrader-saveeditor": { tool: "Arcemi Save Editor" },
  "wolfenstein2009-base": "Base Folder",
  "wolfenstein2009-exe": "Executable",
  "wolfenstein2009-maps": "Maps",
  "wolfenstein2009-pk4": "PK4",
  "wolfenstein2009-streampacks": "Stream Packs",
  "wolfenstein2009-videos": "Videos",
};

/**
 * The mod type a description bullet is about, as a noun phrase: `UE4SS mod`, or `UE4SS mods` when
 * `plural`. Named after the registered mod type, else the installer's section title. A trailing
 * "Mod"/"Mods" is dropped first so `UE4SS Script Mod` does not read "Script Mod mod". A name that is
 * nothing but "Mod" says nothing, so it falls back to the bare generic noun. File extensions in
 * the name are dropped when the `trigger` already quotes one of them - `.par`, `(.webm)`,
 * `(.a2/.a3/.bin)`, `.blcm file` - so `Frosty Mod .fbmod` with a ".fbmod" trigger reads
 * `Frosty mods with a ".fbmod" file`. A name left wrapped in brackets is unwrapped.
 */
function modTypeNoun(section, plural = false, trigger = "") {
  const quoted = trigger.toLowerCase();
  const name = stripMd(section.modTypeName || section.title || "")
    .replace(/(^|\s)\(?(\.\w+(?:\s*\/\s*\.\w+)*)\)?(?:\s+file\b)?(?=\s|$)/gi, (m, lead, exts) =>
      exts.split("/").some((e) => quoted.includes(`"${e.trim().toLowerCase()}"`)) ? lead : m,
    )
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\(([^)]*)\)/, "$1")
    .replace(/(^|\s+)mods?$/i, "")
    .trim();
  if (!name) return plural ? "Mods" : "mods";
  return `${name} ${plural ? "mods" : "mod"}`;
}

/** A mod type name qualified with a user-profile location: "Saves (Local AppData)". */
const USER_PROFILE_NAME = /\((?:local ?appdata|roaming appdata|appdata|documents|saved games)\)/i;

/**
 * Destination prose for a config or save mod type whose user-profile folder cannot be resolved
 * statically (built from a registry value or per-user folder at runtime); null for anything else.
 */
function userProfileProse(s) {
  const name = `${s.modTypeName || ""} ${s.title || ""}`;
  if (!s.userProfile && !USER_PROFILE_NAME.test(name)) return null;
  if (/\bsave/i.test(name)) return "the game's save folder";
  if (/\bconfig/i.test(name)) return "the game's config folder";
  return null;
}

/** Description bullets open with the mod type or tool name, so its first letter is a capital. */
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Most names a description trigger list shows before the rest are summarised as a count. */
const DESCRIPTION_LIST_CAP = 8;
/** Names shown when a list is over the cap. */
const DESCRIPTION_LIST_SHOWN = 6;
/** A run of quoted names: `"a", "b" or "c"`, with the noun that follows it when there is one. */
const QUOTED_LIST = /"[^"]*"(?:(?:, | or )"[^"]*")*( (?:folder|file)\b)?/g;

/**
 * Shorten the name lists in a description trigger. The notes keep every name; a mod page bullet
 * only has to tell a user which kind of archive it is about. Repeated names are dropped, three or
 * more consecutive zero-padded numbers collapse to a range (`"0000" to "0035"`), and a list still
 * longer than DESCRIPTION_LIST_CAP shows its first DESCRIPTION_LIST_SHOWN names plus a count.
 */
function tidyTrigger(trigger) {
  return trigger.replace(QUOTED_LIST, (match, noun = "") => {
    const names = [...new Set([...match.matchAll(/"([^"]*)"/g)].map((m) => m[1]))];
    const tokens = [];
    for (let i = 0; i < names.length; ) {
      let j = i;
      while (
        /^\d+$/.test(names[i]) &&
        j + 1 < names.length &&
        names[j + 1].length === names[i].length &&
        /^\d+$/.test(names[j + 1]) &&
        Number(names[j + 1]) === Number(names[j]) + 1
      ) {
        j++;
      }
      tokens.push(j - i >= 2 ? `"${names[i]}" to "${names[j]}"` : `"${names[i]}"`);
      i = j > i + 1 ? j + 1 : i + 1;
    }
    const join = (list) =>
      list.length > 1 ? `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}` : list[0];
    if (tokens.length <= DESCRIPTION_LIST_CAP) return join(tokens) + noun;
    // The count is the list's last alternative, so the noun moves into it:
    // `an "action", "chr" or one of 13 other named folders`.
    const kind = noun.trim();
    const others = !kind
      ? "names"
      : kind === "file" && names.every((n) => n.startsWith("."))
        ? "file types"
        : `named ${kind}s`;
    const rest = tokens.length - DESCRIPTION_LIST_SHOWN;
    return join([...tokens.slice(0, DESCRIPTION_LIST_SHOWN), `one of ${rest} other ${others}`]);
  });
}

function renderDescription(ctx) {
  const { sections, allFomodGuarded } = ctx;
  const L = [];
  L.push(INSTALL_HEADING);
  L.push("[list]");
  // A multi-game extension can carry the same installer once per game; the page says it once.
  const pushItem = (line) => {
    const item = `[*]${line}[/*]`;
    if (!L.includes(item)) L.push(item);
  };
  for (const s of sections) {
    const trigger =
      s.quickTrigger && s.quickTrigger !== "-"
        ? fixArticle(tidyTrigger(stripMd(s.quickTrigger)))
        : null;
    const rawTarget = fmtTarget(s);
    const target =
      rawTarget === "-"
        ? userProfileProse(s)
        : s.targetIsProse || rawTarget === GAME_FOLDER_PROSE
          ? rawTarget
          : `the ${stripMd(rawTarget)} folder${stripMd(xboxNote(s))}`;
    // A tool installer handles the loader/manager itself, so "installs mods with" is wrong for it.
    const isTool = !!s.toolName || (s.lead && /not mods for it/i.test(s.lead));
    // The catch-all installer has no trigger worth naming and usually no mod type.
    const isFallback = trigger && /anything not matched/i.test(trigger);
    // Every bullet opens with the mod type or tool it is about, not with a verb.
    const mods = capitalize(modTypeNoun(s, true, trigger || ""));
    let line;
    if (isFallback) {
      line = `Any other mod not described above installs to ${target || GAME_FOLDER_PROSE}.`;
    } else if (isTool) {
      // Section titles carry a "(tool)" / "(mod loader)" qualifier that reads as clutter here.
      const toolName = capitalize(s.toolName || s.title.replace(/\s*\([^)]*\)\s*$/, ""));
      if (target && trigger) line = `${toolName} installs to ${target}, recognised by ${trigger}.`;
      else if (target) line = `${toolName} installs to ${target}.`;
      else if (trigger) line = `${toolName} is recognised by ${trigger}.`;
      else line = `${toolName} can be installed through Vortex.`;
    } else if (trigger && target) {
      line = `${mods} with ${trigger} install to ${target}.`;
    } else if (trigger) {
      line = `${mods} are recognised by ${trigger}.`;
    } else if (target) {
      line = `${mods} install to ${target}.`;
    } else {
      line = `${mods} are supported.`;
    }
    pushItem(line);
    // Extra description-only lines a block attaches to its section.
    for (const extra of s.descExtra || []) pushItem(stripMd(extra));
  }
  if (!sections.length) pushItem(NO_INSTALLER_LINE);
  if (allFomodGuarded) {
    L.push(
      '[*]Archives with a FOMOD installer (a "fomod" folder with ModuleConfig.xml) are handed to Vortex\'s built-in FOMOD installer instead.[/*]',
    );
  }
  L.push("[/list]");
  return L.join("\n");
}

/** Store label per resolved app-id constant, in the order the pages list them. */
const STORE_IDS = [
  ["STEAMAPP_ID", "Steam"],
  ["STEAMAPP_ID_DEMO", "Steam Demo"],
  ["GOGAPP_ID", "GOG"],
  ["EPICAPP_ID", "Epic"],
  ["UPLAYAPP_ID", "Ubisoft Connect"],
  ["EAAPP_ID", "EA"],
  ["XBOXAPP_ID", "Xbox"],
];

/**
 * Stores located through the Windows registry rather than by a store app id. Support
 * for them does not depend on the app-id constant ever being filled in.
 */
const REGISTRY_STORES = new Set(["UPLAYAPP_ID", "EAAPP_ID"]);

/**
 * Values of the ids the game is discovered by: DISCOVERY_IDS_ACTIVE, else the literal array in
 * the spec's `discovery: { ids: [...] }`, plus every `id:` in the `gameFinderQuery` object that
 * extensions registering `queryArgs` declare their stores in. Null when none can be read.
 */
function discoveryIds(src, table) {
  const resolveIds = (list) =>
    splitAtTopLevelCommas(list)
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => {
        const v = resolveWithFallback(a, table, src);
        return v == null ? a : String(v);
      });
  let ids = resolveArray("DISCOVERY_IDS_ACTIVE", src, table);
  if (!ids.length) {
    const m = src.match(/\bdiscovery\s*:\s*\{[^}]*?\bids\s*:\s*\[([^\]]*)\]/);
    if (m) ids = resolveIds(m[1]);
  }
  const q = /\bconst\s+gameFinderQuery\s*=\s*\{/.exec(src);
  if (q) {
    const open = q.index + q[0].length - 1;
    const close = scanToMatchingClose(src, open, "{", "}");
    if (close !== -1) {
      const body = stripComments(src.slice(open + 1, close));
      for (const m of body.matchAll(/\bid\s*:\s*([^,}\s]+)/g)) ids.push(...resolveIds(m[1]));
    }
  }
  return ids.length ? new Set(ids) : null;
}

/**
 * The store list, one line per app-id constant that resolves to a real value.
 * A store the game is not sold on carries a null or empty constant, so it drops out.
 * The registry-detected stores are the exception: declaring the constant is enough to
 * list them, because the installation is found without the app id. Every other id must
 * also be one the game is discovered by: Vortex never finds an install through an id it is
 * not told about, and ids are often filled in long before (or deliberately without) being
 * added to discovery - a demo, a store build that cannot be modded, an unreleased version.
 */
function renderSupportedVersions(ctx) {
  const L = [];
  L.push(SUPPORTED_HEADING);
  L.push("[list]");
  for (const [name, label] of STORE_IDS) {
    const value = ctx.table.get(name);
    let supported = REGISTRY_STORES.has(name) ? ctx.table.has(name) : isRealValue(value);
    if (supported && !REGISTRY_STORES.has(name) && ctx.discovery) {
      supported = ctx.discovery.has(String(value));
    } else if (supported && name === "STEAMAPP_ID_DEMO") {
      // Discovery could not be read: a demo id alone says nothing about support.
      supported = false;
    }
    if (supported) L.push(`[*]${label}[/*]`);
  }
  L.push("[*]Other versions may need to select the installation location manually.[/*]");
  L.push("[/list]");
  return L.join("\n");
}

/**
 * Credit lines for the page's Credits section. A credit entry in CREDITS_BY_GAME is either one of
 * these keys or a bespoke line used verbatim (code credits that name someone outside this set).
 * Texts are the wording the live pages already use; Pickysaurus uses the keeper wording.
 */
const CREDIT_LINES = {
  nagev:
    "Credit to [url=https://next.nexusmods.com/profile/Nagev/about-me]Nagev[/url] (Nexus Mods Vortex Developer) for his support on helping me learn to make Vortex extensions, and being patient when I break things :)",
  insomnious:
    "Credit to [url=https://next.nexusmods.com/profile/insomnious/about-me]insomnious[/url] (Nexus Mods App Developer) for his Palworld extension and the method for dynamically setting the game executable so that the Xbox version is supported.",
  pickysaurus:
    "Credit to [url=https://next.nexusmods.com/profile/Pickysaurus/about-me]Pickysaurus[/url] (Nexus Mods Community Manager) for his Unreal Engine Mod Installer extension, which I customized to make it work here with all UE5 mods.",
  wistipouf:
    'Credit to [url=https://next.nexusmods.com/profile/Wistipouf/about-me]Wistipouf[/url] for writing the functions to automatically rename ".patch_0" files.',
  beykerykt: "Credit to BeYkeRYkt and his Ready Or Not Vortex extension for some FBLO functions.",
  "senjay-schedule1":
    "Credit to Senjay and his [url=https://www.nexusmods.com/site/mods/1243]Schedule 1 Vortex extension[/url] for some of the logic used in the plugin installer.",
  fch823:
    "Credit to [url=https://next.nexusmods.com/profile/FCH823/about-me]FCH823[/url] for their [url=https://www.nexusmods.com/site/mods/588?tab=description]TFC Installer[/url] tool that enables data mods for this game.",
};

/** Credits an extension gets when CREDITS_BY_GAME has no entry for it, keyed by engine. */
const ENGINE_CREDITS = {
  "ue4-5": ["pickysaurus", "beykerykt", "nagev"],
  "unity-melon-bepinex": ["senjay-schedule1"],
};

/**
 * Per-game credits where the live page differs from the engine default, Nagev's line last.
 * Seeded 2026-10-11 from the 270 published extension pages (read-only v1 sweep) and widened
 * 2026-10-26 with every credit the live pages carried (sync_mod_pages.py --specials). An
 * engine-default game with no live credits beyond that default is not listed: it gets
 * ENGINE_CREDITS. Edit here, never on the page.
 */
const CREDITS_BY_GAME = {
  abioticfactor: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  ageofmythologyretold: ["insomnious", "nagev"],
  alanwake2: ["nagev"],
  anno117paxromana: ["nagev"],
  avowed: ["pickysaurus", "insomnious", "beykerykt", "nagev"],
  batmanarkhamasylum: ["fch823", "nagev"],
  batmanarkhamcity: ["fch823", "nagev"],
  batmanarkhamorigins: [
    "Credit to Senjay and his [url=https://www.nexusmods.com/site/mods/903]Batman: Arkham Knight Vortex extension[/url] for some code used in the .upk installer.",
    "fch823",
    "nagev",
  ],
  bellwright: [
    "Credit to DMVoidKitten for assisting with updating this extension to accomodate the game's changing mod landscape.",
    "pickysaurus",
    "beykerykt",
    "nagev",
  ],
  bioshock: ["fch823", "nagev"],
  bioshock2: ["fch823", "nagev"],
  bioshockinfinite: ["fch823", "nagev"],
  blackmythwukong: ["pickysaurus", "beykerykt"],
  borderlands: ["fch823", "nagev"],
  borderlands2: ["fch823", "nagev"],
  borderlands3: ["nagev"],
  clairobscurexpedition33: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  control: [
    "Big thanks to [url=https://next.nexusmods.com/profile/registrator2000]registrator2000[/url] for his original Control extension, the Plugin and Loose Files Loaders, and for graciously allowing me to use this page for the new extension.",
  ],
  crimsondesert: ["nagev"],
  darkmessiahofmightandmagic: [
    "Thanks to ClementJ18 for his [url=https://github.com/ClementJ18/moddb]Python moddb scraper[/url], which was used as inspiration for the moddb updater module.",
  ],
  deadrisingdeluxeremaster: ["nagev"],
  deathstranding2onthebeach: ["nagev"],
  deusex: ["nagev"],
  deusexhumanrevolution: ["nagev"],
  deusexinvisiblewar: ["nagev"],
  deusexmankinddivided: ["nagev"],
  dishonored: ["insomnious", "fch823", "nagev"],
  doometernal: [
    "Credit to deleted user Iluviel735 who made a previous extension for this game on Nexus Mods.",
  ],
  dragonsdogma2: ["nagev"],
  dyinglightthebeast: ["nagev"],
  europauniversalisiv: ["nagev"],
  europauniversalisv: ["nagev"],
  forzahorizon6: ["nagev"],
  frostpunk2: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  ghostreconwildlands: ["nagev"],
  godofwar: [
    "Credit to MorGuux (Morgan Gardner) - who made a previous version of the God of War Extension",
  ],
  helldivers2: ["wistipouf", "nagev"],
  highonlife: [
    "pickysaurus",
    "Credit to Lilpit912 for having created a deprecated extension for this game.",
    "beykerykt",
    "nagev",
  ],
  hollowknight: [
    "senjay-schedule1",
    "Credit to Lilpit912 for having created a deprecated extension for this game.",
    "nagev",
  ],
  horizonforbiddenwest: ["nagev"],
  humanitz: [
    "pickysaurus",
    "Credit to tipsychaoscat for making a previous extension for this game.",
    "beykerykt",
    "nagev",
  ],
  kingdomcomedeliverance2: [
    "Credit to [url=https://next.nexusmods.com/profile/infarctus/about-me]infarctus[/url] and his [url=https://www.nexusmods.com/site/mods/684]Darktide Vortex extension[/url] for assisting with some of the load order functions in this extension.",
  ],
  liesofp: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  likeadragonpirateyakuzainhawaii: [
    "Credit to [url=https://next.nexusmods.com/profile/GarnetSunset/mods]GarnetSunset[/url] for co-authoring the extension.",
    "nagev",
  ],
  lordsofthefallen2023: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  lotrwarinthenorthle: ["nagev"],
  madmax: ["nagev"],
  manorlords: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  marvelsspiderman2: ["nagev"],
  mechwarrior5clans: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  menace: [
    "senjay-schedule1",
    "Credit to p0ss for Menace.ModpackLoader.dll file - [url=https://github.com/p0ss/MenaceAssetPacker]https://github.com/p0ss/MenaceAssetPacker[/url] (GPL 3.0 License)",
  ],
  metalgearsolidvtpp: ["nagev"],
  mewgenics: ["nagev"],
  middleearthshadowofwar: [
    "Credit to Lilpit912 for having created a deprecated extension for this game.",
    "nagev",
  ],
  monsterhunterstories3twistedreflection: ["nagev"],
  monsterhunterwilds: ["nagev"],
  mortalkombat: ["pickysaurus", "beykerykt"],
  mywintercar: [
    "senjay-schedule1",
    "Credit to piotrulos for MSCLoader Installer, which I customized to remove unnecessary checks - GPL-3.0 License",
  ],
  needforspeedheat: ["nagev"],
  needforspeedunbound: ["nagev"],
  ninjagaiden2black: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  ninjagaidenfour: ["nagev"],
  ninjagaidenmastercollection: ["nagev"],
  nioh2: ["nagev"],
  nioh3: [
    "Credit to eArmada8 for creating and maintaining Yumia fdata Tools under GPL-3.0 license ([url=https://github.com/eArmada8/yumia_fdata_tools]https://github.com/eArmada8/yumia_fdata_tools[/url] )",
    "nagev",
  ],
  nobodywantstodie: ["pickysaurus", "beykerykt"],
  onimushawayofthesword: ["nagev"],
  painkillerblackedition: ["nagev"],
  pathologic2: ["nagev"],
  pathologic3: ["nagev"],
  pragmata: ["nagev"],
  prey2017: ["insomnious", "nagev"],
  rage: ["nagev"],
  railroader: ["nagev"],
  residentevil4: ["nagev"],
  residentevil42023: ["nagev"],
  residentevil6: ["nagev"],
  residentevil7: ["nagev"],
  residentevilrequiem: ["nagev"],
  roadtovostok: ["nagev"],
  sacred2remaster: ["nagev"],
  selaco: ["nagev"],
  senuassagahellblade2: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  sifu: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  slaythespire2: ["nagev"],
  stalker2heartofchornobyl: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  starwarsbattlefront22017: [
    "Thanks to [url=https://next.nexusmods.com/profile/alistair3149/about-me]alistair3149[/url] for making a previous extension for this game.",
    "nagev",
  ],
  streetfighter6: ["nagev"],
  thelastofuspart1: [
    "Credit to rm-NoobInCoding on GitHub for creating [url=https://github.com/rm-NoobInCoding/UnPSARC]UnPSARC[/url] tool, and making it freely available with the MIT License.",
    "nagev",
  ],
  thelastofuspart2: [
    "Credit to derwangler for creating the [url=https://www.nexusmods.com/thelastofuspart2/mods/31]ndarc tool[/url] and the [url=https://www.nexusmods.com/thelastofuspart2/mods/32]ndmodloader[/url]. He was also gracious enough to allow me to include the ndarc executable in this extension for a better user experience.",
    "nagev",
  ],
  theouterworlds: ["insomnious", "pickysaurus", "beykerykt", "nagev"],
  trailsintheskyfirstchapter: [
    "Credit to [url=https://github.com/eArmada8/kuro_mdl_tool]eArmada8 on GitHub[/url] for the .pac file extraction script.",
    "nagev",
  ],
  unrealtournament2004: ["nagev"],
  untildawn: ["pickysaurus", "beykerykt"],
  warhammer40000spacemarine2: ["nagev"],
  warhammer40kroguetrader: ["nagev"],
  watchdogs: ["nagev"],
  wuchangfallenfeathers: ["pickysaurus", "insomnious", "beykerykt", "nagev"],
  yakuzakiwami3: ["nagev"],
};

/** Donation block, byte-identical across every published extension page. */
const SUPPORT_BLOCK = [
  "[b]❤️ Support the Mod Author: [/b]",
  "If you would like to support my work, you can do so below. Your support is greatly appreciated!",
  "",
  "",
  "[url=https://www.paypal.com/donate/?hosted_button_id=ZFE99JKP43D2G][img]https://live.staticflickr.com/65535/54395661414_10e6ef111d_m.jpg[/img][/url]",
  "",
  "",
  "[url=https://ko-fi.com/chemboy1nexusmods/][img]https://live.staticflickr.com/65535/54380730333_357df43249_n.jpg[/img][/url]",
  "",
  "",
  "[url=https://buymeacoffee.com/chemboy1/][img]https://live.staticflickr.com/65535/54379586002_8dcc6370e5_m.jpg[/img][/url]",
].join("\n");

const SUPPORT_HEADING = SUPPORT_BLOCK.split("\n")[0];
const CREDITS_HEADING = "[b]🤝 Credits:[/b]";

/** Value of a plain `const|let|var NAME = true|false;` declaration, or null when there is none. */
function boolLiteral(src, name) {
  const decl = new RegExp(`^[ \\t]*(?:const|let|var)\\s+${name}\\s*=\\s*(true|false)\\s*;`, "m");
  const m = decl.exec(src);
  return m ? m[1] === "true" : null;
}

/**
 * Whether the extension registers its game with symlink support, read from `supportsSymlinks:`.
 * Four shapes exist: a literal, a boolean constant (`allowSymlinks`), and `SYM_LINKS`, which the
 * UE4-5 template declares true and flips false inside `if (IO_STORE) { ... }`. Anything else is
 * unresolved, so the page gets no note rather than a wrong one. Several registrations (multi-game
 * extensions) must agree. Vortex only treats `=== false` as unsupported, so an extension that never
 * sets the key supports symlinks. Returns { supported: true | false | null, reason }.
 */
function resolveSymlinkSupport(src) {
  const exprs = [...src.matchAll(/\bsupportsSymlinks:\s*([^,}\n]+)/g)].map((m) =>
    m[1].replace(/\/\/.*$/, "").trim(),
  );
  if (!exprs.length) return { supported: true, reason: null };
  const values = exprs.map((expr) => {
    if (expr === "true" || expr === "false") return expr === "true";
    if (!/^[A-Za-z_$][\w$]*$/.test(expr)) return null;
    let value = boolLiteral(src, expr);
    if (value === null) return null;
    // `if (FLAG) { NAME = false; }` overrides the declared default; FLAG must be a plain literal.
    const override = new RegExp(
      `if\\s*\\(\\s*(!?)\\s*([A-Za-z_$][\\w$]*)\\s*\\)\\s*\\{[^{}]*?\\b${expr}\\s*=\\s*(true|false)\\s*;`,
      "g",
    );
    for (const m of src.matchAll(override)) {
      const flag = boolLiteral(src, m[2]);
      if (flag === null) return null;
      if (flag !== (m[1] === "!")) value = m[3] === "true";
    }
    return value;
  });
  if (values.includes(null)) return { supported: null, reason: `unresolved: ${exprs.join(", ")}` };
  if (new Set(values).size > 1) return { supported: null, reason: `mixed: ${exprs.join(", ")}` };
  return { supported: values[0], reason: null };
}

/** BBCode credit lines for one extension: its CREDITS_BY_GAME entry, else the engine default. */
function creditsFor(gameId, engine) {
  const keys = CREDITS_BY_GAME[gameId] || ENGINE_CREDITS[engine] || [];
  return keys.map((k) => CREDIT_LINES[k] || k);
}

/** What identifies a credit line already on a page: its first link, else the whole text. */
function creditKey(line) {
  const m = /\[url=([^\]]+)\]/i.exec(line);
  return (m ? m[1] : line).trim().toLowerCase();
}

const SYMLINK_KEY = /does not support symlinks/i;
const LOGICMODS_KEY = /LogicMod \(Blueprint\) Mod Authors/i;

/** The warning blocks a page carries between its store list and its install list. */
function warningBlocks(page) {
  return {
    symlinks:
      page.symlinks.supported === false
        ? "[size=3][b][color=#ea9999]This game does not support symlinks. You must have the mod staging folder and the game on the same drive to use this extension.[/color][/b][/size]"
        : null,
    logicmods: page.logicFolder
      ? `[size=3][b][color=#f9cb9c]UE4SS LogicMod (Blueprint) Mod Authors - You MUST include a "${page.logicFolder}" folder above your .pak file in order for this extension to install the mod to the correct location. Without this, there is no way to differentiate between LogicMod paks and regular pak mods.[/color][/b][/size]`
      : null,
  };
}

const USAGE_HEADING = "[b]📋 Usage Notes:[/b]";
const FOLDER_ICON_NOTE =
  "[*]You can open several useful files/folders/URLs using the buttons within the folder icon on the Mods toolbar.[/*]";

/**
 * Usage notes a UE4-5 page carries beyond the folder-icon line, read from the template toggles:
 * the UE4SS download button, which page sorts which mods, the same-drive rule for config and save
 * mods, and the Engine Injector mod type. Worded as the live pages word them, so the page check
 * finds the hand-written copies already covered.
 */
function usageNotesFor(src, engine, installers) {
  if (engine !== "ue4-5") return [];
  const has = (fn) => installers.some((i) => i.testFn === fn);
  const ue4ss = boolLiteral(src, "ue4ssLoadOrder") !== false;
  const notes = [];

  if (ue4ss && /["'`]Download UE4SS[^"'`]*["'`]/.test(src)) {
    const pageNo = /^\s*const\s+UE4SS_PAGE_NO\s*=\s*(\d+)/m.exec(src);
    const from = pageNo && Number(pageNo[1]) !== 0 ? "Nexus Mods" : "GitHub";
    notes.push(
      `You can download UE4SS from ${from} using the button within the folder icon on the Mods toolbar.`,
    );
  }

  const pages = [];
  if (boolLiteral(src, "PAKMOD_LOADORDER") === true && has("testPak")) {
    pages.push(["Pak mods", "Load Order"]);
  }
  if (ue4ss && src.includes('"UE4SS Load Order"')) {
    pages.push(["UE4SS Script and DLL mods", "UE4SS Load Order"]);
  }
  if (boolLiteral(src, "logicModsLoadOrder") === true && src.includes('"LogicMods Load Order"')) {
    pages.push(["UE4SS LogicMods (Blueprint)", "LogicMods Load Order"]);
  }
  if (pages.length) {
    const parts = pages.map(
      ([what, title], i) => `${what}${i ? "" : " are sorted"} on the "${title}" page`,
    );
    let line = `${joinAnd(parts)}.`;
    if (pages[0][1] === "Load Order" && src.includes("retagFomodPakMod")) {
      line += " Pak mods placed by a FOMOD installer show up there too.";
    }
    notes.push(line);
  }

  const types = [has("testConfig") && "Config", has("testSave") && "Save"].filter(Boolean);
  const hardlinks =
    boolLiteral(src, "preferHardlinks") === true || boolLiteral(src, "IO_STORE") === true;
  if (types.length && hardlinks && src.includes("checkPartitions(")) {
    const folder = types.map((t) => t.toLowerCase()).join("/");
    let line =
      `${joinAnd(types)} mods only work if the game, the mod staging folder and the ${folder} ` +
      "folder are all on the same drive (limitation of hardlinks).";
    if (src.includes("partitionCheckNotify("))
      line += " Vortex shows a notification when they are not.";
    notes.push(line);
  }

  const binaries = /^\s*const\s+BINARIES_NAME\s*=\s*["'`]([^"'`]+)["'`]/m.exec(src);
  if (binaries && has("testBinaries")) {
    notes.push(
      `For upscalers, reshades, and other mods that need to be next to the game executable, please use the "${binaries[1]}" mod type. This is the fallback mod install location if no other installer is triggered.`,
    );
  }
  return notes.map((n) => `[*]${n}[/*]`);
}

/** Credit lines as the bulleted list a Credits section holds. */
function creditsList(lines) {
  return ["[list]", ...lines.map((l) => `[*]${l}[/*]`), "[/list]"].join("\n");
}

function creditsSection(page) {
  return page.credits.length ? CREDITS_HEADING + "\n" + creditsList(page.credits) : null;
}

/**
 * Add the blocks a page is missing without touching anything the author wrote: the symlink and
 * LogicMod-authors warnings go in front of the install list, the Credits section in front of the
 * support block. A block already on the page (matched by key phrase, or by profile link for a
 * credit) is left alone, so a second run changes nothing. Returns { text, added, notes }.
 */
function ensureBlocks(existing, page) {
  const added = { symlinks: 0, logicmods: 0, usageNotes: 0, credits: 0, creditLines: 0 };
  const notes = [];
  let text = existing;
  const insertAt = (idx, block) => {
    const gap = text.slice(Math.max(0, idx - 2), idx) === "\n\n" || idx === 0 ? "" : "\n";
    text = text.slice(0, idx) + gap + block + "\n\n" + text.slice(idx);
  };
  const warn = warningBlocks(page);

  if (page.symlinks.supported === true && SYMLINK_KEY.test(text)) {
    notes.push("symlink warning on the page but the extension supports symlinks - left in place");
  }
  const installAt = text.indexOf(INSTALL_HEADING);
  if (installAt === -1) {
    notes.push("no install list heading - warning blocks not added");
  } else {
    if (warn.logicmods && !LOGICMODS_KEY.test(text)) {
      insertAt(installAt, warn.logicmods);
      added.logicmods++;
    }
    if (warn.symlinks && !SYMLINK_KEY.test(text)) {
      // Scaffold order is symlinks first, so sit in front of the LogicMod note when it is there.
      const logicAt = text.search(LOGICMODS_KEY);
      insertAt(
        logicAt === -1 ? text.indexOf(INSTALL_HEADING) : text.lastIndexOf("\n", logicAt) + 1,
        warn.symlinks,
      );
      added.symlinks++;
    }
  }

  // Usage notes go at the end of the Usage Notes list; one already there (same text) is kept.
  const usage = page.usageNotes.filter((n) => !text.includes(n.slice(3, -4)));
  if (usage.length) {
    const headAt = text.indexOf(USAGE_HEADING);
    const listEnd = headAt === -1 ? -1 : text.indexOf("[/list]", headAt);
    if (listEnd === -1) {
      notes.push("no Usage Notes list - usage notes not added");
    } else {
      text = text.slice(0, listEnd) + usage.join("\n") + "\n" + text.slice(listEnd);
      added.usageNotes += usage.length;
    }
  }

  const wanted = page.credits;
  let headAt = text.indexOf(CREDITS_HEADING);
  if (headAt === -1) {
    // A page that carries its own Credits heading (pulled from a live page) keeps it.
    const own = /^\[(?:b|size=\d)\][^\n]*\bCredits:[^\n]*$/m.exec(text);
    if (own) headAt = own.index;
  }
  if (headAt === -1 && wanted.length) {
    const supportAt = text.indexOf(SUPPORT_HEADING);
    if (supportAt === -1) {
      text = text.replace(/\s*$/, "") + "\n\n" + creditsSection(page) + "\n";
    } else {
      insertAt(supportAt, creditsSection(page));
    }
    added.credits++;
    added.creditLines += wanted.length;
  } else if (headAt !== -1) {
    // The credit lines are the paragraph right under the heading; what follows it (images,
    // carried sections) is left alone. That paragraph is rebuilt as one bulleted list, with
    // the missing credit lines added at its end.
    const supportAt = text.indexOf(SUPPORT_HEADING, headAt);
    const sectionEnd = supportAt === -1 ? text.length : supportAt;
    const body = text.slice(headAt, sectionEnd).toLowerCase();
    const missing = wanted.filter((l) => !body.includes(creditKey(l)));
    const headEnd = text.indexOf("\n", headAt);
    const blockStart = headEnd === -1 ? text.length : headEnd + 1;
    let blockEnd = text.indexOf("\n\n", blockStart);
    if (blockEnd === -1 || blockEnd > sectionEnd) blockEnd = sectionEnd;
    const items = text
      .slice(blockStart, blockEnd)
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^\[\/?list(?:=[^\]]*)?\]$/i.test(l))
      .map((l) => l.replace(/^\[\*\]\s*/, "").replace(/\s*\[\/\*\]$/, ""))
      .concat(missing);
    if (items.length) {
      const list = creditsList(items);
      text =
        headEnd === -1
          ? text + "\n" + list + "\n"
          : text.slice(0, blockStart) + list + text.slice(blockEnd);
      added.creditLines += missing.length;
    }
  }
  return { text, added, notes };
}

const AUTHOR_NOTES_HEADING = "[b]📝 Notes for Mod Authors:[/b]";
const SPOILER_CLOSE = "[/spoiler]";

/** The NOTES_FOR_MOD_AUTHORS.bbcode text without its title line (the page heading replaces it). */
function authorNotesBody(bbcode) {
  const lines = bbcode.replace(/\r/g, "").split("\n");
  lines.shift();
  if (lines.length) lines[0] = lines[0].replace(/^\[\/color\]\[\/b\]/, "");
  return lines.join("\n").trim();
}

/**
 * Put the game's Notes for Mod Authors on the page as a collapsed spoiler section, in front of the
 * Credits section (else the support block). The block is generated: an existing one, from its
 * heading to its [/spoiler], is replaced on every run, so the page follows the notes files.
 */
function applyAuthorNotes(existing, bbcode) {
  let text = existing;
  const oldAt = text.indexOf(AUTHOR_NOTES_HEADING);
  if (oldAt !== -1) {
    const closeAt = text.indexOf(SPOILER_CLOSE, oldAt);
    if (closeAt !== -1) {
      text = text.slice(0, oldAt) + text.slice(closeAt + SPOILER_CLOSE.length).replace(/^\n+/, "");
    }
  }
  const block = `${AUTHOR_NOTES_HEADING}\n[spoiler]\n${authorNotesBody(bbcode)}\n${SPOILER_CLOSE}`;
  let at = text.indexOf(CREDITS_HEADING);
  if (at === -1) {
    // A page that carries its own Credits heading (pulled from a live page) has it in front, too.
    const own = /^\[(?:b|size=\d)\][^\n]*\bCredits:[^\n]*$/m.exec(text);
    at = own ? own.index : text.indexOf(SUPPORT_HEADING);
  }
  if (at === -1) return text.replace(/\s*$/, "") + "\n\n" + block + "\n";
  const gap = text.slice(Math.max(0, at - 2), at) === "\n\n" || at === 0 ? "" : "\n";
  return text.slice(0, at) + gap + block + "\n\n" + text.slice(at);
}

/**
 * Whole-page scaffold, used only when no DESCRIPTION.bbcode exists yet. Follows
 * the section order every published extension page uses. The parts a generator cannot
 * know - loader lines and per-game usage notes - are left for the author.
 */
function scaffoldDescription(ctx, installBlock, supportedBlock) {
  const L = [];
  L.push(`This extension adds ${ctx.gameName} modding support to Vortex Mod Manager.`);
  L.push("");
  L.push(supportedBlock);
  const warn = Object.values(warningBlocks(ctx.page)).filter(Boolean);
  if (warn.length) {
    L.push("");
    L.push(warn.join("\n\n"));
    L.push("");
  }
  L.push(installBlock);
  L.push(USAGE_HEADING);
  L.push("[list]");
  L.push(FOLDER_ICON_NOTE, ...ctx.page.usageNotes);
  L.push("[/list]");
  L.push("");
  const credits = creditsSection(ctx.page);
  if (credits) {
    L.push(credits);
    L.push("");
  }
  L.push(SUPPORT_BLOCK);
  L.push("");
  return L.join("\n");
}

/**
 * Replace one generated list inside a page that already exists, from its heading
 * through the closing [/list]. Everything the author wrote around it survives.
 * Returns null when the heading is absent, so the caller can decide whether that
 * is a refusal or simply a section this page does not carry.
 *
 * Items carrying BBCode markup are kept and moved to the top of the rebuilt list.
 * Those are the lines no generator can produce - the yellow "downloaded automatically"
 * loader line, a red caveat - and the house style already puts them first. Generated
 * lines are always plain text, so nothing is duplicated by keeping them.
 */
const AUTHOR_ITEM = /\[(?:b|i|u|color|size|url|img)[=\]]/i;

function spliceList(existing, heading, block) {
  const start = existing.indexOf(heading);
  if (start === -1) return null;
  const listEnd = existing.indexOf("[/list]", start);
  if (listEnd === -1) return null;
  const oldItems = existing.slice(start, listEnd).match(/^\[\*\].*$/gm) || [];
  const kept = oldItems.filter((item) => AUTHOR_ITEM.test(item));
  const lines = block.split("\n");
  const listOpen = lines.indexOf("[list]");
  if (kept.length && listOpen !== -1) lines.splice(listOpen + 1, 0, ...kept);
  return existing.slice(0, start) + lines.join("\n") + existing.slice(listEnd + "[/list]".length);
}

/**
 * Refresh both generated lists on an existing page. The install list is mandatory -
 * a page without that heading is not one this generator wrote, so the caller refuses
 * it. The store list is optional: a page laid out without it still gets its install
 * list updated rather than being skipped wholesale.
 */
function spliceDescription(existing, installBlock, supportedBlock) {
  const withInstall = spliceList(existing, INSTALL_HEADING, installBlock);
  if (withInstall === null) return null;
  return spliceList(withInstall, SUPPORTED_HEADING, supportedBlock) || withInstall;
}

// ── per-extension build ─────────────────────────────────────────────────────

/** Hand-written wording known to be wrong or outdated; the lint flags it wherever it appears. */
const STALE_PHRASES = [
  [/\(no subfolder\)/i, '"(no subfolder)" - the generator words this "the game folder"'],
  [/Xbox \(Game Pass\)/i, '"Xbox (Game Pass)" - the store is listed as "Xbox"'],
  [/Game Pass version is supported/i, 'credit says "Game Pass version" - now "Xbox version"'],
  [/\bXXX\b/, "unfilled XXX placeholder"],
];

/**
 * Read-only checks on a page as it sits on disk, which is what a push sends. Returns one
 * `{ kind, detail }` per finding. Kinds: store (a listed store the game is not discovered by),
 * bare (a bullet with no destination: "are supported." / "are recognised by"), duplicate (a bullet listed twice), long-list (more than
 * DESCRIPTION_LIST_CAP names in one list), name-repeat (a mod type name quoting its own
 * trigger extension), stale (STALE_PHRASES).
 */
function lintDescription(text, ctx) {
  const findings = [];
  const add = (kind, detail) => findings.push({ kind, detail });
  const items = [...text.matchAll(/\[\*\]([\s\S]*?)\[\/\*\]/g)].map((m) => m[1]);
  const headAt = text.indexOf(SUPPORTED_HEADING);
  const supportedList =
    headAt === -1 ? null : /\[list\]([\s\S]*?)\[\/list\]/.exec(text.slice(headAt));
  if (supportedList && ctx.discovery) {
    const labels = [...supportedList[1].matchAll(/\[\*\](.*?)\[\/\*\]/g)].map((m) => m[1].trim());
    for (const [name, label] of STORE_IDS) {
      if (REGISTRY_STORES.has(name) || !labels.includes(label)) continue;
      const value = ctx.table.get(name);
      if (!isRealValue(value) || !ctx.discovery.has(String(value))) {
        add("store", `lists ${label}, but ${name} is not one of the ids the game is discovered by`);
      }
    }
  }
  const seen = new Set();
  for (const item of items) {
    const short = item.length > 90 ? `${item.slice(0, 87)}...` : item;
    if (seen.has(item)) add("duplicate", short);
    seen.add(item);
    if (/ are (supported\.|recognised by )/.test(item)) add("bare", short);
    for (const m of item.matchAll(QUOTED_LIST)) {
      const count = (m[0].match(/"[^"]*"/g) || []).length;
      if (count > DESCRIPTION_LIST_CAP) add("long-list", `${count} names: ${short}`);
    }
    const lead = /^(.*?) mods with /.exec(item);
    const exts = lead ? lead[1].match(/\.\w+\b/g) || [] : [];
    if (exts.some((ext) => item.toLowerCase().includes(`"${ext.toLowerCase()}"`))) {
      add("name-repeat", short);
    }
  }
  for (const [re, why] of STALE_PHRASES) if (re.test(text)) add("stale", why);
  return findings;
}

function buildNotes(dirName, src) {
  documentingTemplate = dirName.startsWith("template-");
  const table = buildSymbolTable(src);
  const header = parseHeader(src);
  const engine = detectEngine(dirName);
  const installers = extractInstallers(src, table);
  const modTypes = [...extractModTypes(src, table), ...extractRegisterModTypes(src, table)];
  const vars = buildVars(src, table);

  const isTemplate = dirName.startsWith("template-");
  let gameName = (header.name || dirName).replace(/\s*Vortex Extension\s*$/i, "").trim() || dirName;
  // Templates carry XXX placeholders instead of a real game name.
  if (isTemplate || !gameName || gameName === "XXX") {
    gameName = isTemplate ? `${dirName} (template)` : dirName;
  }

  // Only claim FOMOD passthrough when every registered installer actually checks
  // for fomod/ModuleConfig.xml - it is near-universal but not guaranteed.
  const allFomodGuarded =
    installers.length > 0 &&
    installers.every((inst) => {
      if (!inst.testFn) return false;
      const body = sliceFunction(src, inst.testFn);
      return !!body && /moduleconfig\.xml/i.test(body);
    });

  const targetById = new Map();
  for (const mt of modTypes) {
    if (mt.id && mt.targetPath && !String(mt.targetPath).includes("${")) {
      // A bare `{gamePath}` is the game folder itself, "." to fmtTarget.
      targetById.set(mt.id, String(mt.targetPath).replace(/^\{gamePath\}[\\/]?/, "") || ".");
    }
  }

  const sorted = installers.slice().sort((a, b) => Number(a.priority) - Number(b.priority));

  const sections = [];
  let tier1 = 0,
    tier2 = 0;
  const unknownFns = [];
  const dropped = [];

  for (const inst of sorted) {
    // A block pinned with `game` applies to that one extension folder only. Needed where a test
    // function name is shared across extensions that have no engine key to tell them apart.
    const block = PROSE.find(
      (p) =>
        p.fn === inst.testFn &&
        (p.game !== undefined
          ? p.game === dirName
          : Array.isArray(p.engine)
            ? p.engine.includes(engine)
            : p.engine === engine),
    );
    // A loader's own installers stay registered when the extension does not offer that loader,
    // but describing them would tell users about a loader they never get.
    if (block && block.loader && !vars.LOADERS.includes(block.loader)) continue;
    // A block returns one section, or an array when one installer covers several mod types.
    let parts = [];
    if (block) {
      const built = block.build(vars);
      if (built) {
        parts = Array.isArray(built) ? built : [built];
        tier1++;
      } else {
        // The block matched but a constant it needs did not resolve.
        dropped.push(inst.testFn);
      }
    }
    if (!parts.length) {
      // Tier 2 - derive what we can from the test function itself.
      const body = inst.testFn ? sliceFunction(src, inst.testFn) : null;
      const triggers = body ? deriveTrigger(body, src, table) : [];
      const name = prettifyId(inst.id, dirName);
      parts = [
        {
          title: name,
          lead: triggers.length
            ? `Recognised when the archive contains ${joinAnd(triggers)}.`
            : `Handled by the \`${inst.testFn || inst.id}\` installer. ` +
              `Inspect the extension source for the exact archive layout it expects.`,
          rules: [],
          pitfalls: [],
        },
      ];
      tier2++;
      if (inst.testFn && !block) unknownFns.push(inst.testFn);
    }
    // The registered mod type this installer feeds, for the description bullets. An entry whose
    // name fell back to its own id has no real display name, so it does not count.
    // Most installers share their mod type's id; one that does not names its type in the
    // install function's `setmodtype` instruction instead.
    const typeId = modTypes.some((m) => m.id === inst.id)
      ? inst.id
      : setModTypeOf(src, inst.installFn, table) || inst.id;
    const modType = modTypes.find((m) => m.id && m.id === typeId);
    const labelKey = Object.hasOwn(MOD_TYPE_LABELS, inst.id) ? inst.id : typeId;
    const label = Object.hasOwn(MOD_TYPE_LABELS, labelKey) ? MOD_TYPE_LABELS[labelKey] : null;
    for (const section of parts) {
      const rawTarget = section.installsTo || targetById.get(typeId) || null;
      section.target = section.targetIsProse ? rawTarget : cleanTarget(rawTarget, src);
      // The Xbox build keeps its binaries in WinGDK; getExecutable switches the folder at runtime.
      section.xboxWinGdk =
        vars.XBOX_WINGDK &&
        !!section.target &&
        /(^|[\\/])Binaries[\\/]Win64([\\/]|$)/i.test(String(section.target));
      section.quickTrigger = quickTrigger(section);
      section.modTypeName =
        modType && modType.name && modType.name !== modType.id ? modType.name : null;
      if (typeof label === "string") section.modTypeName = label;
      else if (label) section.toolName = label.tool;
      // A mod type named for the tool itself ("Atlan Mod Loader") holds the tool, not mods for it.
      else if (section.modTypeName && TOOL_TYPE_NAME.test(section.modTypeName))
        section.toolName = section.modTypeName;
      sections.push(section);
    }
  }

  // What the page says beyond the two generated lists: warnings and credits.
  const gameId = dirName.replace(/^(game|template)-/, "");
  const page = {
    symlinks: resolveSymlinkSupport(src),
    logicFolder:
      engine === "ue4-5" && installers.some((i) => i.testFn === "testLogic")
        ? vars.LOGICMODS_FOLDER || "LogicMods"
        : null,
    usageNotes: isTemplate ? [] : usageNotesFor(src, engine, installers),
    credits: isTemplate ? [] : creditsFor(gameId, engine),
  };

  const title = `Notes for Mod Authors - ${gameName}`;
  const discovery = discoveryIds(src, table);
  const ctx = { title, gameName, sections, allFomodGuarded, table, page, discovery };
  const installBlock = renderDescription(ctx);
  const supportedBlock = renderSupportedVersions(ctx);
  return {
    md: renderMarkdown(ctx),
    bbcode: renderBBCode(ctx),
    description: installBlock,
    supported: supportedBlock,
    page,
    ctx,
    scaffold: () => scaffoldDescription(ctx, installBlock, supportedBlock),
    tier1,
    tier2,
    unknownFns,
    dropped,
  };
}

/** One-line trigger for the quick-reference table. */
function quickTrigger(section) {
  if (section.quick) return stripTableCell(section.quick);
  if (section.lead) {
    const m = section.lead.match(/Recognised when the archive contains (.+?)\.$/);
    if (m) return stripTableCell(m[1]);
  }
  return "-";
}

function stripTableCell(s) {
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

function joinAnd(items) {
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

/** Turn `subnautica2-logicmods` into `Logic Mods` when no prose block exists. */
function prettifyId(id, dirName) {
  if (!id) return "Mod";
  const gameId = dirName.replace(/^game-/, "");
  let s = String(id)
    .replace(new RegExp(`^${gameId}-?`), "")
    .replace(/^-/, "");
  if (!s) s = String(id);
  s = s.replace(/[-_]+/g, " ").trim();
  return s.replace(/\b\w/g, (c) => c.toUpperCase()) || String(id);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);
const cliFlags = new Set(rawArgs.filter((a) => a.startsWith("--")));
const gameArgs = rawArgs.filter((a) => !a.startsWith("--"));
const doJson = cliFlags.has("--json");
const doTemplates = cliFlags.has("--templates");
// --lint judges the description pages on disk and writes nothing, so it implies both of these.
const doLint = cliFlags.has("--lint");
const doDescription = cliFlags.has("--description") || doLint;
const doCheck = cliFlags.has("--check") || doLint;
const jsonResults = [];

function emit(line = "") {
  if (doJson) process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

/**
 * Write content to filePath, or with --check only compare. Returns true when the file on
 * disk differs from `content` (or does not exist yet).
 */
function putFile(filePath, content) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (!doCheck) writeFileAtomic(filePath, content);
  return existing !== content;
}

const entries = fs.readdirSync(ROOT, { withFileTypes: true });
let extDirs = entries
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((n) => n.startsWith("game-") || (doTemplates && n.startsWith("template-")))
  .sort();

if (gameArgs.length > 0) {
  const wanted = new Set(gameArgs.map((a) => a.replace(/^(game|template)-/, "")));
  extDirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter(
      (n) =>
        (n.startsWith("game-") || n.startsWith("template-")) &&
        wanted.has(n.replace(/^(game|template)-/, "")),
    )
    .sort();
}

// An id that matches no game-/template- folder (a typo, or a helper-* row, which this generator
// does not scan) must fail loudly: "Written: 0" with exit 0 reads as success to the GUI.
if (gameArgs.length > 0 && extDirs.length === 0) {
  console.error(`Error: no matching directories found for: ${gameArgs.join(", ")}`);
  process.exit(1);
}

let created = 0,
  skipped = 0,
  errors = 0,
  drifted = 0,
  tier1Total = 0,
  tier2Total = 0,
  droppedTotal = 0;
const tier2Heavy = [];
const blockTotals = { symlinks: 0, logicmods: 0, usageNotes: 0, credits: 0, creditLines: 0 };
const unresolvedSymlinks = [];
const pageNotes = [];
const lintTotals = {};
let lintPages = 0;

for (const dir of extDirs) {
  const indexPath = path.join(ROOT, dir, "index.js");
  if (!fs.existsSync(indexPath)) {
    emit(`  SKIP  ${dir} (no index.js)`);
    skipped++;
    jsonResults.push({ id: dir, ok: false, error: "no index.js" });
    continue;
  }
  try {
    const src = fs.readFileSync(indexPath, "utf8");
    const {
      md,
      bbcode,
      description,
      supported,
      page,
      scaffold,
      tier1,
      tier2,
      unknownFns,
      dropped,
      ctx,
    } = buildNotes(dir, src);
    if (doLint) {
      // Hand-kept variants (DESCRIPTION_custom.bbcode) are pushed too, so they are judged as well.
      const pages = fs
        .readdirSync(path.join(ROOT, dir))
        .filter((f) => /^DESCRIPTION.*\.bbcode$/i.test(f))
        .sort();
      if (!pages.length) {
        emit(`  LINT  ${dir}: missing - no ${DESCRIPTION_FILE}`);
        lintTotals.missing = (lintTotals.missing || 0) + 1;
      }
      const found = [];
      for (const file of pages) {
        const text = fs.readFileSync(path.join(ROOT, dir, file), "utf8");
        for (const f of lintDescription(text, ctx)) {
          const where = file === DESCRIPTION_FILE ? "" : ` [${file}]`;
          emit(`  LINT  ${dir}${where}: ${f.kind} - ${f.detail}`);
          lintTotals[f.kind] = (lintTotals[f.kind] || 0) + 1;
          found.push({ file, ...f });
        }
      }
      if (found.length) lintPages++;
      created++;
      jsonResults.push({ id: dir, ok: true, lint: found });
      continue;
    }
    if (doDescription) {
      // The page is hand-written around these lists, so an existing file is spliced,
      // never rewritten. Only a brand new page gets the full scaffold.
      const descPath = path.join(ROOT, dir, DESCRIPTION_FILE);
      if (page.symlinks.supported === null)
        unresolvedSymlinks.push(`${dir}: ${page.symlinks.reason}`);
      let blocks;
      if (fs.existsSync(descPath)) {
        const existing = fs.readFileSync(descPath, "utf8");
        const spliced = spliceDescription(existing, description, supported);
        if (spliced === null) {
          emit(`  SKIP  ${dir} (${DESCRIPTION_FILE} has no "${INSTALL_HEADING}" list to replace)`);
          skipped++;
          jsonResults.push({ id: dir, ok: false, error: "no install list heading" });
          continue;
        }
        const ensured = ensureBlocks(spliced, page);
        // Template pages are scaffolds, not published pages: no notes section.
        const merged = dir.startsWith("template-")
          ? ensured.text
          : applyAuthorNotes(ensured.text, bbcode);
        blocks = ensured.added;
        for (const k of Object.keys(blockTotals)) blockTotals[k] += blocks[k];
        for (const n of ensured.notes) pageNotes.push(`${dir}: ${n}`);
        if (merged === existing) {
          emit(`  OK    ${dir} (${DESCRIPTION_FILE} already up to date)`);
        } else if (doCheck) {
          emit(`  DRIFT ${dir} (${DESCRIPTION_FILE} generated content differs)`);
          drifted++;
          jsonResults.push({ id: dir, ok: false, error: "drift", description: true, blocks });
          continue;
        } else {
          writeFileAtomic(descPath, merged);
          emit(`  OK    ${dir} (${DESCRIPTION_FILE} generated content updated)`);
        }
      } else if (doCheck) {
        emit(`  DRIFT ${dir} (${DESCRIPTION_FILE} missing)`);
        drifted++;
        jsonResults.push({ id: dir, ok: false, error: "drift", description: true });
        continue;
      } else {
        writeFileAtomic(
          descPath,
          dir.startsWith("template-") ? scaffold() : applyAuthorNotes(scaffold(), bbcode),
        );
        emit(
          `  NEW   ${dir} (${DESCRIPTION_FILE} scaffolded - fill in the loader and usage lines)`,
        );
      }
      created++;
      jsonResults.push({ id: dir, ok: true, description: true, blocks });
      continue;
    }
    const mdDiffers = putFile(path.join(ROOT, dir, "NOTES_FOR_MOD_AUTHORS.md"), md);
    const bbDiffers = putFile(path.join(ROOT, dir, "NOTES_FOR_MOD_AUTHORS.bbcode"), bbcode);
    tier1Total += tier1;
    tier2Total += tier2;
    droppedTotal += dropped.length;
    if (tier2 > 0 && tier1 === 0) tier2Heavy.push(dir);
    if (doCheck && (mdDiffers || bbDiffers)) {
      emit(`  DRIFT ${dir}`);
      drifted++;
      jsonResults.push({ id: dir, ok: false, error: "drift", tier1, tier2, unknownFns, dropped });
      continue;
    }
    created++;
    const note =
      tier2 > 0 ? `  (${tier1} documented, ${tier2} auto-derived)` : `  (${tier1} documented)`;
    emit(`  OK    ${dir}${note}`);
    jsonResults.push({ id: dir, ok: true, tier1, tier2, unknownFns, dropped });
  } catch (err) {
    emit(`  ERROR ${dir}: ${err.message}`);
    errors++;
    jsonResults.push({ id: dir, ok: false, error: err.message });
  }
}

emit("");
if (doLint) {
  const kinds = Object.entries(lintTotals)
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
  emit(`Done.  Linted: ${created}  With findings: ${lintPages}  Errors: ${errors}`);
  emit(`Findings: ${kinds || "none"}`);
  if (doJson) {
    process.stdout.write(
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          linted: created,
          findings: lintTotals,
          results: jsonResults,
        },
        null,
        2,
      ) + "\n",
    );
  }
  // Findings are for a person to judge, not a gate.
  process.exit(errors > 0 ? 1 : 0);
}
const doneNote = doCheck ? `Drifted: ${drifted}` : `Written: ${created}`;
emit(`Done.  ${doneNote}  Skipped: ${skipped}  Errors: ${errors}`);
if (!doDescription) emit(`Sections: ${tier1Total} documented, ${tier2Total} auto-derived`);
if (droppedTotal) {
  emit(
    `${droppedTotal} section(s) fell back to auto-derived because a documented block could not ` +
      `resolve a constant it needs (see "dropped" in --json)`,
  );
}
if (tier2Heavy.length) {
  emit(`Extensions with no documented sections yet: ${tier2Heavy.length}`);
}
if (doDescription) {
  const verb = doCheck ? "to add" : "added";
  emit(
    `Blocks ${verb}: symlink warning ${blockTotals.symlinks}, LogicMod-authors note ${blockTotals.logicmods}, ` +
      `usage notes ${blockTotals.usageNotes}, Credits section ${blockTotals.credits}, credit lines ${blockTotals.creditLines}`,
  );
  if (unresolvedSymlinks.length) {
    emit(`Symlink support unresolved, no warning written (${unresolvedSymlinks.length}):`);
    for (const line of unresolvedSymlinks) emit(`  ${line}`);
  }
  for (const line of pageNotes) emit(`NOTE  ${line}`);
}

if (doJson) {
  process.stdout.write(
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        created,
        skipped,
        errors,
        drifted,
        tier1: tier1Total,
        tier2: tier2Total,
        dropped: droppedTotal,
        blocks: blockTotals,
        unresolvedSymlinks,
        results: jsonResults,
      },
      null,
      2,
    ) + "\n",
  );
}

process.exit(errors > 0 || (doCheck && drifted > 0) ? 1 : 0);
