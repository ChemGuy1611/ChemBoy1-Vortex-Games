/**
 * generate_notes.js
 * Scans every game-* folder in this repo, reads index.js, and writes mod-author
 * packaging documentation describing how a mod archive must be laid out for each
 * installer to recognise it. template-* folders are included only with --templates.
 *
 * Two files are written per extension, always:
 *   NOTES_FOR_MOD_AUTHORS.md          markdown, for the repo / GitHub
 *   NOTES_FOR_MOD_AUTHORS.bbcode.txt  BBCode, paste-ready for a Nexus mod page
 *
 * Both are always overwritten.
 *
 * Run with:  node generate_notes.js
 *            node generate_notes.js subnautica2 [GAME_ID ...]
 *            node generate_notes.js railroader --description
 *
 * Flags:
 *   --json       Write machine-readable JSON to stdout; progress goes to stderr.
 *   --templates  Also process template-* folders (when no GAME_ID args given).
 *   --description  Write DESCRIPTION.bbcode.txt, the Nexus mod page description, in
 *                  place of the notes files. Its "Mod Installation Notes" list is one
 *                  line per installer, trigger + destination ("Installs mods with an
 *                  "info.json" file to the "Mods" folder."). An existing page keeps
 *                  everything the author wrote - only the list between the heading and
 *                  its closing [/list] is replaced. A missing page is scaffolded with
 *                  the standard section order for the author to finish.
 *
 * Drift checking is deliberately NOT a flag here - it is handled by the
 * generated-docs audit, which regenerates and diffs.
 *
 * Content comes from two tiers:
 *   Tier 1  hand-written prose keyed by the installer's test function name, with
 *           per-game constants interpolated. Accurate advice, real pitfalls.
 *   Tier 2  trigger conditions derived mechanically from the test function body,
 *           for installers with no tier-1 block yet. Always correct, less helpful.
 * The coverage report shows which extensions still lean on tier 2.
 *
 * JSON output schema:
 *   { timestamp, created, skipped, errors,
 *     tier1, tier2, results: [{ id, ok, error?, tier1, tier2, unknownFns }] }
 */

const fs   = require('fs');
const path = require('path');

const {
  buildSymbolTable,
  splitAtTopLevelCommas,
  scanToMatchingClose,
  resolveValue,
  resolveWithFallback,
  isRealValue,
  parseHeader,
  extractModTypes,
  extractRegisterModTypes,
  extractInstallers,
} = require('./extension_parser');

const ROOT = __dirname;

// ── engine detection ────────────────────────────────────────────────────────

/**
 * Load a resources/lists/*.txt game-ID list. These are the authoritative record
 * of which template an extension follows (produced by categorize_games.py);
 * folder names and the index.js "Structure:" header are both unreliable.
 * First whitespace-separated column is the game ID; some lists are TSV.
 */
function loadList(name) {
  const file = path.join(ROOT, 'resources', 'lists', name);
  if (!fs.existsSync(file)) return new Set();
  return new Set(
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(l => (l.includes('\t') ? l.split('\t').filter(Boolean)[1] || '' : l).trim())
      .filter(Boolean)
  );
}

/**
 * Engine keys in precedence order, most specific first. Only genuine engine lists
 * appear here: games-unrealextension.txt, games-unreal4-5-xbox.txt and games-uemi.txt
 * are strict subsets of games-ue4-5.txt (they record features, not engines), and the
 * downloader/github/loadorder lists are cross-cutting. Under this order every game
 * resolves to exactly one engine.
 */
const ENGINE_LISTS = [
  ['ue4-5', 'games-ue4-5.txt'],
  ['ue2-3', 'games-ue2-3.txt'],
  ['reengine', 'games-reengine.txt'],
  ['unity-melon-bepinex', 'games-unity-melonloader-bepinex.txt'],
  ['unity-bepinex', 'games-unity-bepinex.txt'],
  ['unity-umm', 'games-unity-umm.txt'],
  ['anvil', 'games-anvil.txt'],
  ['frostbite', 'games-frostbite.txt'],
  ['farcry', 'games-farcrygame.txt'],
  ['reloaded2', 'games-reloaded2.txt'],
  ['cobra-acse', 'games-cobra-acse.txt'],
  ['godot', 'games-godot.txt'],
  ['rpgmaker', 'games-rpgmaker.txt'],
  ['snowdrop', 'games-snowdrop.txt'],
  ['srmm', 'games-srmm.txt'],
  ['basic', 'games-basic.txt'],
].map(([engine, file]) => [engine, loadList(file)]);

/** Template folder -> engine key, for the template-* extensions themselves. */
const TEMPLATE_ENGINES = {
  'template-ue4-5': 'ue4-5',
  'template-tfcinstaller-ue2-3': 'ue2-3',
  'template-reframework-fluffy': 'reengine',
  'template-unitymelonloaderbepinex-hybrid': 'unity-melon-bepinex',
  'template-unitybepinex': 'unity-bepinex',
  'template-unity-umm': 'unity-umm',
  'template-anvilengine': 'anvil',
  'template-frostbite': 'frostbite',
  'template-farcry': 'farcry',
  'template-reloaded2': 'reloaded2',
  'template-cobraengineACSE': 'cobra-acse',
  'template-godot': 'godot',
  'template-rpgmaker': 'rpgmaker',
  'template-snowdropengine': 'snowdrop',
  'template-shinryu': 'srmm',
  'template-basic': 'basic',
};

/**
 * Map an extension directory to an engine key used to scope prose blocks.
 * Test-function names collide across engines (testRoot means something different
 * in a Unity extension than in an Unreal one), so a block only applies when its
 * engine matches.
 */
function detectEngine(dirName) {
  if (TEMPLATE_ENGINES[dirName]) return TEMPLATE_ENGINES[dirName];
  const id = dirName.replace(/^game-/, '');
  for (const [engine, set] of ENGINE_LISTS) {
    if (set.has(id)) return engine;
  }
  return null;
}

// ── value helpers ───────────────────────────────────────────────────────────

/**
 * Resolve an array-literal declaration (e.g. ROOT_FOLDERS = [EPIC_CODE_NAME, 'Engine'])
 * to its element values. buildSymbolTable only handles scalars, so arrays are read
 * straight from source here.
 */
function resolveArray(name, src, table) {
  const re = new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*\\[([^\\]]*)\\]`);
  const m = src.match(re);
  if (!m) return [];
  if (!m[1].trim()) return [];
  return splitAtTopLevelCommas(m[1])
    .map(a => a.trim())
    .filter(Boolean)
    .map(a => {
      const v = resolveWithFallback(a, table, src);
      return v == null ? a : String(v);
    })
    .filter(v => v && v !== 'XXX');
}

/**
 * Resolve an object property that holds an array, whether written inline
 * (`fileExt: ['.pak']`) or as a reference to an array constant (`fileExt: PAKMOD_EXTS`).
 */
function resolveObjArray(objName, prop, src, table) {
  const objRe = new RegExp(`(?:const|let)\\s+${objName}\\s*=\\s*\\{`);
  const om = objRe.exec(src);
  if (!om) return [];
  const open = src.indexOf('{', om.index);
  const close = scanToMatchingClose(src, open, '{', '}');
  if (close === -1) return [];
  const body = src.slice(open + 1, close);
  const pm = new RegExp(`\\b${prop}\\s*:\\s*([^,\\n]+)`).exec(body);
  if (!pm) return [];
  const raw = pm[1].trim().replace(/,$/, '');
  if (raw.startsWith('[')) {
    return splitAtTopLevelCommas(raw.slice(1, raw.lastIndexOf(']')))
      .map(a => resolveWithFallback(a.trim(), table, src))
      .filter(x => x && !String(x).includes('${'))
      .map(String);
  }
  if (/^[A-Za-z_$]\w*$/.test(raw)) return resolveArray(raw, src, table);
  return [];
}

/** Look up a scalar constant, returning null when unresolved or a placeholder. */
function val(name, src, table) {
  let v = table.has(name) ? table.get(name) : resolveWithFallback(name, table, src);
  if (v == null) return null;
  v = String(v);
  if (!v || v === name || v === 'XXX' || v === 'null' || v.includes('${')) return null;
  return v;
}

/** Windows-style display path. */
function disp(p) {
  return p ? String(p).replace(/\//g, '\\') : p;
}

/** Quote a list of names for prose: `a`, `b` or `c`. */
function orList(items, wrap = '`') {
  const w = items.map(i => `${wrap}${i}${wrap}`);
  if (w.length === 0) return '';
  if (w.length === 1) return w[0];
  return w.slice(0, -1).join(', ') + ' or ' + w[w.length - 1];
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
const NON_UE_ENGINES = ['basic', 'unity-bepinex', 'unity-melon-bepinex', 'unity-umm',
  'anvil', 'frostbite', 'farcry', 'reloaded2', 'cobra-acse', 'godot', 'rpgmaker',
  'snowdrop', 'srmm', 'ue2-3', 'reengine'];

/**
 * Section for an installer that handles a modding TOOL or loader rather than a mod.
 * Mod authors do not package these; the note exists so they can tell the difference.
 */
function toolBlock({ title, tool, marker, installsTo, extra }) {
  return {
    title,
    quick: marker ? `a \`${marker}\` file` : `the ${tool} files`,
    installsTo: installsTo || null,
    lead: `This installer handles ${tool} itself, not mods for it. It exists so users can ` +
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
function matchBlock({ title, lead, files, exts, folders, installsTo, tree, pitfalls, warn, targetIsProse, userProfile }) {
  const rules = [];
  if (folders && folders.length) {
    rules.push(`Recognised by a folder named ${orList(folders)} in the archive.`);
  }
  if (files && files.length) {
    rules.push(`Recognised by ${folders && folders.length ? 'a file' : 'any file'} named ${orList(files)}.`);
  }
  if (exts && exts.length) {
    rules.push(`Recognised by any file with the ${orList(exts)} extension${exts.length > 1 ? 's' : ''}.`);
  }
  if (!rules.length) return null;
  const quickBits = [
    folders && folders.length ? `a \`${folders[0]}\` folder` : null,
    files && files.length ? `a \`${files[0]}\` file` : null,
    exts && exts.length ? `a \`${exts[0]}\` file` : null,
  ].filter(Boolean);
  return {
    title,
    quick: quickBits.join(' or '),
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
    fn: 'testJiangyu', game: 'game-menace',
    build: (v) => v.JIANGYU_FILE ? toolBlock({
      title: 'Jiangyu Loader',
      tool: 'the Jiangyu loader',
      marker: v.JIANGYU_FILE,
      installsTo: v.JIANGYU_PATH,
      extra: [
        'Vortex downloads and installs the loader on its own, so this installer only comes into ' +
          'play for a copy the user downloaded by hand from a mod page.',
      ],
    }) : null,
  },
  {
    fn: 'testJiangyuMod', game: 'game-menace',
    build: (v) => matchBlock({
      title: 'Jiangyu Mods',
      files: v.JIANGYUMOD_FILE ? [v.JIANGYUMOD_FILE] : [],
      installsTo: v.JIANGYUMOD_PATH,
      lead: 'A Jiangyu mod is a folder with a `jiangyu.json` manifest at its root, exactly as ' +
            '`jiangyu package` produces it. Ship that folder inside the archive, or the manifest ' +
            'and its files at the top level - both are handled.',
      tree: [
        'MyMod.zip',
        '└── MyMod',
        '    ├── jiangyu.json',
        '    ├── assets',
        '    ├── compiled',
        '    └── templates',
      ].join('\n'),
      pitfalls: [
        'The `name` in `jiangyu.json` decides the folder your mod is installed into, and is what ' +
          'other mods list in `depends`. Keep it stable between releases - changing it makes ' +
          'existing dependencies stop resolving.',
        'Vortex adds a numbered prefix to that folder so the load order page can reorder your ' +
          'mod. Do not rely on the folder name in any path inside your mod.',
      ],
    }),
  },
  {
    fn: 'testPatch', game: 'game-helldivers2',
    build: () => ({
      title: 'Patch Mods (.patch_0)',
      quick: 'a file named `<archive hash>.patch_0`',
      lead: 'Almost every Helldivers 2 mod is a patch mod. A patch file is named after the game ' +
            'archive it edits - a 16-character hex hash - followed by a patch number. Graphics ' +
            'and sound mods use the same format and are installed the same way.',
      tree: [
        'MyArmourMod.zip',
        '├── 9ba626afa44a3aa3.patch_0',
        '├── 9ba626afa44a3aa3.patch_0.gpu_resources',
        '├── 9ba626afa44a3aa3.patch_0.stream',
        '└── readme.txt',
      ].join('\n'),
      rules: [
        'Recognised by any file matching `<16 hex characters>.patch_<number>`, for example ' +
          '`9ba626afa44a3aa3.patch_0`. Any archive hash works - there is no fixed list.',
        'The `.gpu_resources` and `.stream` sidecar files are optional. Ship whichever ones your ' +
          'mod actually needs; some archives have them and some do not.',
        'Always number your files from `patch_0`. Vortex renumbers them at deploy time so that ' +
          'every mod editing the same archive gets a unique, gap-free number, in the order the ' +
          'user sets on the Mod Priority page. Your own numbering only decides the order of your ' +
          'own files within one archive.',
        'A mod may ship patch files for several archives at once, and several files for one ' +
          'archive (`x.patch_0` and `x.patch_1`). Both are handled.',
        'To offer variants without a manifest, put each complete set of patch files in its own ' +
          'folder. Vortex asks the user which folder to install - once for the whole mod, not ' +
          'once per file. Name the folders after what they contain, because those names are what ' +
          'the user picks from.',
        'A `manifest.json` at the top level of the archive is read and preferred over the folder ' +
          'layout, so your options get real names, descriptions, thumbnails and categories. All ' +
          'three community versions are supported: the legacy format (no `Version` property, ' +
          '`Options` is a list of folder names and exactly one is installed), version 1 ' +
          '(`Options` are objects with `Name`, `Description`, `Image`, `Include` and ' +
          '`SubOptions`) and version 2 (version 1 plus `Guid`, `CategoryRef` and `Categories`).',
        'In a version 1 or 2 manifest the user may enable any number of options, and each ' +
          'enabled option installs exactly one of its `SubOptions`. A folder named in `Include` ' +
          'must hold the patch files directly - subfolders of it are not searched.',
        'If a manifest cannot be read, or none of its options resolve to folders that exist in ' +
          'the archive, Vortex logs the problem and falls back to the folder layout. A bad ' +
          'manifest never stops the mod from installing.',
        'When two enabled options both change the same archive, Vortex numbers their files into ' +
          'one contiguous sequence for that archive. This is expected, not a conflict.',
        'Documentation files at the top level of the archive are installed alongside the patch ' +
          'files and are left untouched. `manifest.json` itself and any images it points at are ' +
          'not installed - they are only used for the option picker.',
      ],
      pitfalls: [
        'Numbering files `patch_1` or higher to "load later" - the number in your archive is not ' +
          'the number the game sees. Priority is set by the user in Vortex, not by the file name.',
        'Renaming a patch file to a hash the installed game does not have. The game silently ' +
          'ignores a patch for an archive it does not know, so the mod appears to do nothing. ' +
          'Vortex warns about this at install time.',
        'Putting a readme inside each variant folder - only files at the top level of the archive ' +
          'are installed alongside the patch files, so keep shared documentation at the root.',
        'Leaving out a `.patch_0` file but shipping its `.gpu_resources` or `.stream` sidecar. A ' +
          'sidecar is only ever installed next to the patch file it belongs to.',
        'Nesting patch files one level below the folder you list in `Include`. That folder is ' +
          'read without recursion, so a mod built that way installs nothing.',
        'Hand-numbering files across option folders to control which option wins. Numbers are ' +
          'reassigned per archive in option order; only the order of your files inside a single ' +
          'folder is preserved.',
        'Expecting `NexusData` in a manifest to point Vortex at the right Nexus Mods ' +
          'mod page. Vortex tracks that identity itself and ignores the field.',
      ],
    }),
  },
  {
    fn: 'testMaps', engine: 'godot',
    build: (v) => {
      const exts = v.MAPS_EXTS && v.MAPS_EXTS.length ? v.MAPS_EXTS : ['.map'];
      const target = v.MAPS_PATH || v.MAPS_FOLDER || 'maps';
      return {
        title: 'Map Mods',
        quick: `a \`${exts[0]}\` file with a matching \`.json\` file`,
        installsTo: target,
        lead: 'Levels for the game\'s map loader. A map is a pair of files sharing one name, ' +
              'kept together in a folder named after the map.',
        tree: [
          'MyMap.zip',
          '└── Author-MyMap\\',
          '    ├── mymap.map',
          '    ├── mymap.json',
          '    └── textures\\',
        ].join('\n'),
        rules: [
          `Recognised by a file with the ${orList(exts)} extension that has a \`.json\` file ` +
            `of the same name beside it.`,
          'The folder holding the pair is kept as the installed map folder, so name it after the map.',
          'A `textures` subfolder alongside the pair is installed with it.',
        ],
        pitfalls: [
          'Shipping the map file without its matching `.json` - the pair is what identifies a map, ' +
            'so a lone map file is not recognised and falls through to another installer.',
          'Putting the map files at the archive root - the installer then has to invent a folder ' +
            'name from the archive filename.',
        ],
      };
    },
  },
  {
    fn: 'testLogic', engine: 'ue4-5',
    build: (v) => {
      const folder = v.LOGICMODS_FOLDER || 'LogicMods';
      return {
        title: `Blueprint Mods (${folder})`,
        quick: `a \`${folder}\` folder`,
        installsTo: v.LOGICMODS_PATH ? `${v.LOGICMODS_PATH}/${folder}` : null,
        lead: `Blueprint mods built against UE4SS must sit inside a folder named \`${folder}\`. ` +
              `This is the single most common packaging mistake for Unreal games.`,
        tree: [
          'MyBlueprintMod.zip',
          `└── ${folder}\\`,
          '    └── MyBlueprintMod.pak',
        ].join('\n'),
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
    fn: 'testUe4ssCombo', engine: 'ue4-5',
    build: (v) => ({
      title: 'Combo Mods (pak + UE4SS script/DLL together)',
      quick: 'both a `Content` and a `Binaries` folder',
      installsTo: v.EPIC_CODE_NAME || null,
      lead: 'Use this layout when one download ships both game content and UE4SS mods. ' +
            'It is recognised by the presence of BOTH a `Content` folder and a `Binaries` folder, ' +
            'laid out exactly as they appear inside the game folder.',
      tree: [
        'MyComboMod.zip',
        '├── Content\\',
        '│   └── Paks\\',
        `│       └── ${v.LOGICMODS_FOLDER || 'LogicMods'}\\`,
        '│           └── MyBlueprintMod.pak',
        '└── Binaries\\',
        '    └── Win64\\',
        '        └── ue4ss\\',
        '            └── Mods\\',
        '                └── MyScriptMod\\',
        '                    └── Scripts\\',
        '                        └── main.lua',
      ].join('\n'),
      rules: [
        'Both a `Content` folder and a `Binaries` folder must be present, or this installer is skipped.',
        'Mirror the real in-game folder structure below those two folders.',
        'This installer is tested before the individual pak/script/DLL installers, so a matching archive is always handled as a combo.',
      ],
      pitfalls: [
        'Including only one of `Content` or `Binaries` - the archive then falls through to a different installer.',
        'Adding an extra wrapper folder between `Binaries` and `Win64`.',
      ],
    }),
  },
  {
    fn: 'testPak', engine: 'ue4-5',
    build: (v) => ({
      title: 'Pak Mods',
      quick: `a \`${v.PAK_EXT || '.pak'}\` file`,
      installsTo: v.PAKMOD_PATH || null,
      lead: `Standard content mods: one or more \`${v.PAK_EXT || '.pak'}\` files. ` +
            `Vortex copies just the pak files themselves, flattened, so the folder structure around them does not matter.`,
      tree: [
        'MyPakMod.zip',
        '└── MyPakMod.pak',
      ].join('\n'),
      rules: [
        `Any archive containing a \`${v.PAK_EXT || '.pak'}\` file reaches this installer (unless an earlier one claimed it).`,
        'Only the pak files are installed - surrounding folders are discarded.',
        v.PAKMOD_EXTS && v.PAKMOD_EXTS.length > 1
          ? `Companion files are installed alongside paks: ${orList(v.PAKMOD_EXTS)}.`
          : null,
        'If the archive holds more than one pak, Vortex asks the user which to install - useful for optional variants.',
      ].filter(Boolean),
      pitfalls: [
        'Shipping several unrelated paks in one archive when you meant them all to install - the user gets a choice dialog and may pick only one.',
        `Blueprint mods belong in a \`${v.LOGICMODS_FOLDER || 'LogicMods'}\` folder instead - see above.`,
      ],
    }),
  },
  {
    fn: 'testUe4ss', engine: 'ue4-5',
    build: (v) => {
      const file = v.UE4SS_FILE;
      const subs = v.UE4SS_SUBFOLDERS || [];
      if (!file && !subs.length) return null;
      return {
        title: 'UE4SS Itself',
        quick: file ? `a \`${file}\` file` : 'the UE4SS support folders',
        installsTo: v.BINARIES_PATH || null,
        lead: 'This installer handles the UE4SS runtime package, not individual mods. ' +
              'Most authors never need it - it exists so users can install UE4SS through Vortex.',
        rules: [
          file ? `Recognised by a file named \`${file}\` at any level of the archive.` : null,
          subs.length ? `Also recognised by any of the UE4SS support folders: ${orList(subs)}.` : null,
        ].filter(Boolean),
        pitfalls: [
          `If your script mod archive happens to contain a file named \`${file || 'the UE4SS loader DLL'}\`, ` +
            'it will be treated as a UE4SS install rather than as your mod.',
        ],
      };
    },
  },
  {
    fn: 'testSigBypass', engine: 'ue4-5',
    build: (v) => {
      if (!v.SIGBYPASS_DLL || !v.SIGBYPASS_LUA) return null;
      return {
        title: 'Signature Bypass',
        quick: `\`${v.SIGBYPASS_DLL}\` and \`${v.SIGBYPASS_LUA}\``,
        installsTo: v.BINARIES_PATH || null,
        lead: 'This game ships signed pak files, so a signature bypass is required before most mods will load.',
        rules: [
          `Recognised only when BOTH \`${v.SIGBYPASS_DLL}\` and \`${v.SIGBYPASS_LUA}\` are present in the archive.`,
        ],
        pitfalls: [
          'Shipping only one of the two files - the archive will fall through to another installer.',
        ],
      };
    },
  },
  {
    fn: 'testScripts', engine: 'ue4-5',
    build: (v) => {
      const folder = v.SCRIPTS_FOLDER || 'Scripts';
      const ext = v.SCRIPTS_EXT || '.lua';
      return {
        title: 'UE4SS Script Mods (Lua)',
        quick: `a \`${ext}\` file and a \`${folder}\` folder`,
        installsTo: v.SCRIPTS_PATH || null,
        lead: `Lua mods for UE4SS. Recognised when the archive holds both a \`${ext}\` file and a folder named \`${folder}\`.`,
        tree: [
          'MyScriptMod.zip',
          '└── MyScriptMod\\',
          `    └── ${folder}\\`,
          '        └── main.lua',
        ].join('\n'),
        rules: [
          `The archive must contain a \`${ext}\` file AND a folder named \`${folder}\`.`,
          `Wrap the \`${folder}\` folder in a folder named after your mod. That folder name becomes the mod's UE4SS name ` +
            `and is what gets written to the load order.`,
          `If you omit the wrapper folder, Vortex falls back to naming the mod after the archive file.`,
        ],
        pitfalls: [
          `Putting \`main.lua\` directly in the archive root with no \`${folder}\` folder - the mod is not recognised as a script mod.`,
          'Naming the wrapper folder something generic like `Mods` - that name is what appears in the load order.',
        ],
      };
    },
  },
  {
    fn: 'testDll', engine: 'ue4-5',
    build: (v) => {
      const folder = v.DLL_FOLDER || 'dlls';
      const ext = v.DLL_EXT || '.dll';
      return {
        title: 'UE4SS DLL Mods (C++)',
        quick: `a \`${ext}\` file and a \`${folder}\` folder`,
        installsTo: v.DLL_PATH || null,
        lead: `Compiled UE4SS mods. Recognised when the archive holds both a \`${ext}\` file and a folder named \`${folder}\`.`,
        tree: [
          'MyDllMod.zip',
          '└── MyDllMod\\',
          `    └── ${folder}\\`,
          '        └── main.dll',
        ].join('\n'),
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
    fn: 'testRoot', engine: 'ue4-5',
    build: (v) => {
      const all = [...(v.ROOT_FOLDERS || []), ...(v.ROOTSUB_FOLDERS || []), ...(v.CONTENTSUB_FOLDERS || [])];
      if (!all.length) return null;
      return {
        title: 'Root / Game Folder Mods',
        quick: `a top-level folder such as ${orList(all.slice(0, 3))}`,
        installsTo: 'the game folder itself (no subfolder)',
        targetIsProse: true,
        lead: 'For mods that replace or add files inside the game installation, laid out the same way they appear in the game folder.',
        tree: [
          'MyRootMod.zip',
          `└── ${(v.ROOT_FOLDERS && v.ROOT_FOLDERS[0]) || 'Engine'}\\`,
          '    └── ... files in their real relative locations',
        ].join('\n'),
        rules: [
          `Recognised by a top-level folder matching any of: ${orList(all)}.`,
          'The matched folder and everything below it is copied into the game folder, preserving structure.',
        ],
        pitfalls: [
          'Zipping the folder that CONTAINS the game folders instead of the game folders themselves adds an extra level and misplaces every file.',
        ],
      };
    },
  },
  {
    fn: 'testConfig', engine: 'ue4-5',
    build: (v) => {
      const files = v.CONFIG_FILES || [];
      if (!files.length) return null;
      return {
        title: 'Config File Mods',
        userProfile: true,
        quick: `a config file such as ${orList(files.slice(0, 2))}`,
        installsTo: v.CONFIG_PATH || null,
        lead: 'Config tweaks are deployed to the game\'s config folder in your user profile, not into the game installation.',
        rules: [
          `Recognised by any of these filenames in the archive: ${orList(files)}.`,
          v.CONFIG_PATH ? `Installed to \`${disp(v.CONFIG_PATH)}\`.` : null,
        ].filter(Boolean),
        pitfalls: [
          'Shipping a config file with one of these names inside an unrelated mod - the whole archive is then treated as a config mod.',
        ],
      };
    },
  },
  {
    fn: 'testSave', engine: 'ue4-5',
    build: (v) => {
      const exts = v.SAVE_EXTS || [];
      if (!exts.length) return null;
      return {
        title: 'Save Game Files',
        userProfile: true,
        quick: `a ${orList(exts)} file`,
        installsTo: null,
        lead: 'Save files are deployed to the game\'s save folder in your user profile.',
        rules: [
          `Recognised by any file with extension ${orList(exts)}.`,
        ],
        pitfalls: [
          `Including an example save alongside a normal mod - the archive is then treated as a save, not a mod.`,
        ],
      };
    },
  },
  {
    fn: 'testModKitMod', engine: 'ue4-5',
    build: (v) => {
      if (!v.MODKITMOD_FILE) return null;
      return {
        title: 'Official Mod Kit Mods',
        quick: `a \`${v.MODKITMOD_FILE}\` manifest`,
        installsTo: null,
        lead: `Mods produced with the game's official mod kit, identified by a \`${v.MODKITMOD_FILE}\` manifest.`,
        rules: [
          `Recognised when the archive contains \`${v.MODKITMOD_FILE}\`` +
            (v.MODKITMOD_EXT ? ` AND a \`${v.MODKITMOD_EXT}\` file.` : '.'),
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
    fn: 'testBinaries', engine: 'ue4-5',
    build: (v) => ({
      title: 'Fallback Installer',
      quick: 'anything unrecognised with no pak file',
      installsTo: v.BINARIES_PATH || null,
      lead: 'This is the catch-all. Any archive with no `.pak` file that matched none of the installers above ' +
            'lands here and is copied, unchanged, into the game\'s binaries folder.',
      rules: [
        'Reaching this installer usually means the archive was not laid out in a way Vortex recognised.',
        'Vortex shows the user a notification when a mod installs through the fallback.',
      ],
      pitfalls: [
        'If your mod lands here unintentionally, re-check the layouts above - users will see a fallback warning and may report it as broken.',
      ],
      warn: 'Landing in the fallback installer is a signal your archive layout needs fixing.',
    }),
  },

  {
    // Legacy Unreal pak installer, declared as a const arrow inside main().
    fn: 'testForUnrealMod', engine: 'ue4-5',
    build: (v) => {
      const exts = v.UNREAL_FILE_EXTS && v.UNREAL_FILE_EXTS.length
        ? v.UNREAL_FILE_EXTS : (v.PAK_EXT ? [v.PAK_EXT] : ['.pak']);
      return {
        title: 'Pak Mods',
        quick: `a \`${exts[0]}\` file`,
        installsTo: v.UNREAL_MODS_PATH || null,
        lead: `Standard content mods: one or more \`${exts[0]}\` files. Vortex installs the mod files ` +
              `themselves, so the folder structure around them in the archive does not matter.`,
        tree: ['MyPakMod.zip', `└── MyPakMod${exts[0]}`].join('\n'),
        rules: [
          `Recognised by any file with the ${orList(exts)} extension${exts.length > 1 ? 's' : ''}.`,
          'Surrounding folders are discarded - only the mod files are installed.',
          'If the archive holds several mod files, Vortex asks the user which to install, which is ' +
            'useful for shipping optional variants in one download.',
        ],
        pitfalls: [
          'Shipping several unrelated paks in one archive when you meant them all to install - ' +
            'the user gets a choice dialog and may pick only one.',
        ],
      };
    },
  },

  // ── Unity: BepInEx / MelonLoader ──────────────────────────────────────────
  {
    fn: 'testBepinex', engine: ['unity-bepinex', 'unity-melon-bepinex'],
    build: (v) => {
      if (!v.BEPINEX_FOLDER || !v.BEPINEX_DLL_FILE) return null;
      return toolBlock({
        title: 'BepInEx (mod loader)',
        tool: 'BepInEx',
        marker: v.BEPINEX_DLL_FILE,
        installsTo: 'the game folder itself (no subfolder)',
        extra: [`Requires BOTH a folder named \`${v.BEPINEX_FOLDER}\` and the loader file \`${v.BEPINEX_DLL_FILE}\`.`],
      });
    },
  },
  {
    fn: 'testMelon', engine: ['unity-bepinex', 'unity-melon-bepinex'],
    build: (v) => {
      if (!v.MELON_FOLDER || !v.MELON_DLL_FILE) return null;
      return toolBlock({
        title: 'MelonLoader (mod loader)',
        tool: 'MelonLoader',
        marker: v.MELON_DLL_FILE,
        installsTo: 'the game folder itself (no subfolder)',
        extra: [`Requires BOTH a folder named \`${v.MELON_FOLDER}\` and the loader file \`${v.MELON_DLL_FILE}\`.`],
      });
    },
  },
  {
    fn: 'testPlugin', engine: ['unity-bepinex', 'unity-melon-bepinex'],
    build: (v) => matchBlock({
      title: 'Plugin Mods',
      lead: 'The normal shape for a Unity mod: a compiled plugin DLL. Vortex installs it into the ' +
            'loader\'s mod folder, so the archive does not need to reproduce the loader folder structure.',
      exts: v.PLUGIN_EXTS,
      installsTo: v.BEPINEX_MOD_PATH || v.MELON_MODS_PATH || v.PLUGIN_PATH,
      tree: ['MyPlugin.zip', '└── MyPlugin.dll'].join('\n'),
      pitfalls: [
        'Wrapping the DLL in a `BepInEx\\plugins` folder as well - it can end up nested one level too deep.',
        'Shipping a plugin together with loader files, which makes the archive look like a loader install instead.',
      ],
    }),
  },
  {
    fn: 'testBepCfgMan', engine: ['unity-bepinex', 'unity-melon-bepinex'],
    build: (v) => {
      if (!v.BEPCFGMAN_FILE) return null;
      return toolBlock({
        title: 'BepInEx Configuration Manager',
        tool: 'the BepInEx Configuration Manager plugin',
        marker: v.BEPCFGMAN_FILE,
        installsTo: v.BEPCFGMAN_PATH,
        extra: [`Requires the file \`${v.BEPCFGMAN_FILE}\` together with a \`plugins\` folder.`],
      });
    },
  },
  {
    fn: 'testMelonPrefMan', engine: ['unity-bepinex', 'unity-melon-bepinex'],
    build: (v) => {
      if (!v.MELONPREFMAN_FILE) return null;
      return toolBlock({
        title: 'MelonLoader Preferences Manager',
        tool: 'the MelonLoader Preferences Manager',
        marker: v.MELONPREFMAN_FILE,
        installsTo: v.MELONPREFMAN_PATH,
      });
    },
  },
  // ── Unity Mod Manager / Railloader ─────────────────────────────────────────
  {
    fn: 'testUmm', engine: 'unity-umm',
    build: (v) => v.UMM_INST_EXEC ? toolBlock({
      title: 'Unity Mod Manager (tool)',
      tool: 'Unity Mod Manager',
      marker: v.UMM_INST_EXEC,
      installsTo: '.',
      extra: [
        'Vortex reproduces the loader patch the manager would apply itself, so it deploys and ' +
          'purges like any other mod.',
      ],
    }) : null,
  },
  {
    fn: 'testUmmMod', engine: 'unity-umm',
    build: (v) => {
      if (!v.UMM_MOD_FILE) return null;
      const folder = v.MODS_FOLDER || 'Mods';
      return {
        title: 'Unity Mod Manager Mods',
        quick: `an \`${v.UMM_MOD_FILE}\` file and a \`.dll\``,
        installsTo: `${folder}\\<ModName>`,
        lead: `Mods for Unity Mod Manager: a manifest plus the assembly that implements the mod. ` +
              `Each one gets its own folder under \`${folder}\`.`,
        tree: [
          'MyUmmMod.zip',
          `├── ${v.UMM_MOD_FILE}`,
          '└── MyUmmMod.dll',
        ].join('\n'),
        rules: [
          `Recognised by a file named \`${v.UMM_MOD_FILE}\` together with a \`.dll\` beside it.`,
          `The mod folder name comes from the folder wrapping the manifest. A flat archive is ` +
            `named from the \`Id\` field in \`${v.UMM_MOD_FILE}\` instead, so keep that field filled in.`,
        ],
        pitfalls: [
          `Shipping the manifest without the assembly - the archive is not recognised as a mod.`,
          `Wrapping the mod in an extra \`${folder}\` folder is fine, but a second level of ` +
            `wrapping folders becomes part of the mod folder name.`,
        ],
      };
    },
  },
  {
    fn: 'testRailloaderMod', engine: 'unity-umm',
    build: (v) => {
      if (!v.RAILLOADER_MOD_FILE) return null;
      const folder = v.MODS_FOLDER || 'Mods';
      // The constant is lower case because matching is case-insensitive; mods ship it capitalised.
      const manifest = v.RAILLOADER_MOD_FILE.charAt(0).toUpperCase() + v.RAILLOADER_MOD_FILE.slice(1);
      return {
        title: 'Railloader Mods',
        quick: `a \`${manifest}\` file`,
        installsTo: `${folder}\\<ModName>`,
        lead: `Mods for Railloader, the game's second mod loader. They live in the same ` +
              `\`${folder}\` folder as Unity Mod Manager mods, and are told apart by their manifest.`,
        tree: [
          'MyRailloaderMod.zip',
          `└── MyRailloaderMod\\`,
          `    ├── ${manifest}`,
          '    └── MyRailloaderMod.dll',
        ].join('\n'),
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
    fn: 'testRailloaderApp', engine: 'unity-umm',
    build: (v) => (v.RAILLOADER_FILES && v.RAILLOADER_FILES.length) ? toolBlock({
      title: 'Railloader (tool)',
      tool: 'Railloader',
      marker: v.RAILLOADER_FILES[0],
      installsTo: '.',
      extra: [
        'Railloader has no working download site at the moment, so Vortex cannot fetch it. ' +
          'This installer exists so an archive you already have installs to the right place.',
      ],
    }) : null,
  },
  {
    fn: 'testAssembly', engine: ['unity-bepinex', 'unity-melon-bepinex', 'unity-umm'],
    build: (v) => matchBlock({
      title: 'Assembly Replacement Mods',
      lead: 'Mods that replace a compiled game assembly outright. These overwrite core game files, ' +
            'so they conflict with any other mod touching the same assembly.',
      files: v.ASSEMBLY_FILES,
      installsTo: v.ASSEMBLY_PATH === '.' ? 'the game folder itself (no subfolder)' : v.ASSEMBLY_PATH,
      targetIsProse: v.ASSEMBLY_PATH === '.',
      pitfalls: [
        'Assembly replacements cannot be combined with other assembly mods - state this clearly on the mod page.',
        'Shipping an assembly alongside a plugin makes the whole archive install as an assembly mod.',
      ],
    }),
  },
  {
    fn: 'testAssets', engine: ['unity-bepinex', 'unity-melon-bepinex', 'unity-umm'],
    build: (v) => matchBlock({
      title: 'Asset Replacement Mods',
      lead: 'Mods that replace packed Unity asset files, deployed into the game\'s data folder.',
      exts: v.ASSETS_EXTS,
      installsTo: v.ASSETS_PATH,
      pitfalls: [
        'Asset files must keep their original names to replace the right bundle.',
      ],
    }),
  },

  // ── UE2-3 / TFC ───────────────────────────────────────────────────────────
  {
    fn: 'testTfc', engine: 'ue2-3',
    build: (v) => v.TFC_EXEC ? toolBlock({
      title: 'TFC Installer (tool)',
      tool: 'the TFC Installer',
      marker: v.TFC_EXEC,
    }) : null,
  },
  {
    fn: 'testUpkExplorer', engine: 'ue2-3',
    build: (v) => v.UPKEXPLORER_EXEC ? toolBlock({
      title: 'UPK Explorer (tool)',
      tool: 'UPK Explorer',
      marker: v.UPKEXPLORER_EXEC,
    }) : null,
  },
  {
    fn: 'testTfcMod', engine: 'ue2-3',
    build: (v) => matchBlock({
      title: 'TFC Mods',
      lead: 'Texture/content mods handled through the TFC system.',
      exts: v.TFCMOD_EXTS,
      files: v.TFCMOD_FILES,
      pitfalls: ['Keep the original file names - the TFC system matches them by name.'],
    }),
  },
  {
    fn: 'testCookedSub', engine: 'ue2-3',
    build: (v) => matchBlock({
      title: 'Cooked Content Mods',
      lead: 'Packaged content deployed into the game\'s cooked content folder.',
      folders: v.COOKEDSUB_FOLDERS,
      exts: v.COOKEDSUB_EXTS,
    }),
  },
  {
    fn: 'testMovies', engine: ['ue2-3', 'cobra-acse'],
    build: (v) => matchBlock({
      title: 'Movie / Cutscene Replacements',
      lead: 'Replacement video files, deployed into the game\'s movies folder.',
      exts: v.MOVIES_EXTS,
      pitfalls: ['The replacement must keep the original file name, or the game will not pick it up.'],
    }),
  },
  {
    fn: 'testBinaries', engine: 'ue2-3',
    build: (v) => matchBlock({
      title: 'Binaries / Injector Mods',
      lead: 'DLL injectors and other files that belong next to the game executable.',
      files: v.BINARIES_FILES,
      exts: v.BINARIES_EXTS,
    }),
  },

  // ── RE Engine / Fluffy ────────────────────────────────────────────────────
  {
    fn: 'testFluffy', engine: 'reengine',
    build: (v) => v.FLUFFY_EXEC ? toolBlock({
      title: 'Fluffy Mod Manager (tool)',
      tool: 'Fluffy Mod Manager',
      marker: v.FLUFFY_EXEC,
    }) : null,
  },
  {
    fn: 'testREF', engine: 'reengine',
    build: (v) => v.REF_FILE ? toolBlock({
      title: 'REFramework (mod loader)',
      tool: 'REFramework',
      marker: v.REF_FILE,
    }) : null,
  },
  {
    fn: 'testLooseLua', engine: 'reengine',
    build: (v) => {
      const ext = v.LUA_EXT || '.lua';
      return {
        title: 'Loose Lua Scripts',
        quick: `a \`${ext}\` file outside the REFramework folders`,
        installsTo: null,
        lead: `Standalone REFramework Lua scripts, shipped without the surrounding REFramework folder structure.`,
        rules: [
          `Recognised by a \`${ext}\` file in an archive that does NOT already contain a REFramework folder` +
            (v.REF_FOLDERS && v.REF_FOLDERS.length ? ` (${orList(v.REF_FOLDERS)}).` : '.'),
          'Vortex adds the correct folder structure around the script for you.',
        ],
        pitfalls: [
          'Including an REFramework folder as well switches the archive to a different installer, ' +
            'which expects the full structure to already be correct.',
        ],
      };
    },
  },
  {
    fn: 'testPreset', engine: 'reengine',
    build: (v) => matchBlock({
      title: 'Preset Files',
      lead: 'Configuration presets for REFramework mods.',
      exts: v.PRESET_EXTS,
    }),
  },
  {
    fn: 'testFluffyMod', engine: 'reengine',
    build: () => ({
      title: 'Fluffy-Format Mods',
      quick: 'anything not matched above',
      installsTo: null,
      lead: 'The catch-all for RE Engine mods packaged in the normal Fluffy Mod Manager layout. ' +
            'Most content mods for this game land here, which is the intended outcome.',
      rules: ['Any archive not claimed by an earlier installer is treated as a Fluffy-format mod.'],
      pitfalls: [
        'Because this is a catch-all, a badly laid-out archive still installs - it just may not work. ' +
          'Match the layout Fluffy Mod Manager expects.',
      ],
    }),
  },
  {
    // The live half of the reZip pair. testFluffyMod above is its dead twin: the two are
    // registered from opposite arms of `if (!reZip)`, so exactly one of them exists in any
    // given extension, and every current RE Engine game ships reZip = true.
    fn: 'testZipContent', engine: 'reengine',
    build: () => ({
      title: 'Fluffy-Format Mods',
      quick: 'anything not matched above',
      installsTo: null,
      lead: 'The catch-all for RE Engine mods packaged in the normal Fluffy Mod Manager layout. ' +
            'Most content mods for this game land here, which is the intended outcome.',
      rules: [
        'Any archive not claimed by an earlier installer is treated as a Fluffy-format mod.',
        'An archive already zipped in the Fluffy layout is installed as it is, with no repacking.',
      ],
      pitfalls: [
        'Because this is a catch-all, a badly laid-out archive still installs - it just may not work. ' +
          'Match the layout Fluffy Mod Manager expects.',
      ],
    }),
  },

  // ── Anvil (Assassin's Creed etc.) ─────────────────────────────────────────
  {
    fn: 'testATK', engine: 'anvil',
    build: (v) => v.ATK_EXEC ? toolBlock({
      title: 'AnvilToolkit (tool)',
      tool: 'AnvilToolkit',
      marker: v.ATK_EXEC,
    }) : null,
  },
  {
    fn: 'testForge', engine: 'anvil',
    build: (v) => matchBlock({
      title: 'Forge File Mods',
      lead: 'Replacement `.forge` archives, deployed into the game\'s data folder.',
      exts: v.FORGE_EXT ? [v.FORGE_EXT] : [],
      pitfalls: ['Forge files must keep their original names to replace the right archive.'],
    }),
  },
  {
    fn: 'testExtracted', engine: 'anvil',
    build: (v) => v.EXTRACTED_FOLDER ? matchBlock({
      title: 'Extracted Forge Content',
      lead: 'Unpacked forge content for AnvilToolkit to repack.',
      folders: [v.EXTRACTED_FOLDER],
    }) : null,
  },
  {
    fn: 'testLoose', engine: 'anvil',
    build: (v) => matchBlock({
      title: 'Loose Data Files',
      lead: 'Individual data files deployed into the game folder.',
      exts: v.LOOSE_EXTS,
    }),
  },

  // ── Frostbite ─────────────────────────────────────────────────────────────
  {
    fn: 'testFrosty', engine: 'frostbite',
    build: (v) => v.FROSTY_EXEC ? toolBlock({
      title: 'Frosty Mod Manager (tool)',
      tool: 'Frosty Mod Manager',
      marker: v.FROSTY_EXEC,
    }) : null,
  },
  {
    fn: 'testFbmod', engine: 'frostbite',
    build: (v) => matchBlock({
      title: 'Frosty Mods',
      lead: 'Frostbite mods in Frosty Mod Manager format. Vortex stages them for Frosty rather than ' +
            'deploying them into the game directly.',
      exts: v.FROSTYMOD_EXTS,
      pitfalls: [
        'These mods still have to be applied through Frosty Mod Manager - installing in Vortex alone does not patch the game.',
      ],
    }),
  },

  // ── Far Cry ───────────────────────────────────────────────────────────────
  {
    fn: 'testModInstaller', engine: 'farcry',
    build: (v) => v.MI_FILE ? toolBlock({
      title: 'Mod Installer (tool)',
      tool: 'the Far Cry Mod Installer',
      marker: v.MI_FILE,
    }) : null,
  },
  {
    fn: 'testData', engine: ['farcry', 'srmm'],
    build: (v) => matchBlock({
      title: 'Data File Mods',
      lead: 'Packed game data replacements.',
      exts: v.DATA_EXTS,
    }),
  },
  {
    fn: 'testMiMod', engine: 'farcry',
    build: (v) => matchBlock({
      title: 'Mod Installer Mods',
      lead: 'Mods packaged for the Far Cry Mod Installer.',
      exts: v.MIMOD_EXTS,
      pitfalls: ['These are applied through the Mod Installer tool, not deployed straight into the game.'],
    }),
  },

  // ── Reloaded-II ───────────────────────────────────────────────────────────
  {
    fn: 'testModManger', engine: 'reloaded2',
    build: (v) => v.RELOADED_EXEC ? toolBlock({
      title: 'Reloaded-II (mod loader)',
      tool: 'Reloaded-II',
      marker: v.RELOADED_EXEC,
    }) : null,
  },

  // ── Cobra Engine / ACSE ───────────────────────────────────────────────────
  {
    fn: 'testACSE', engine: 'cobra-acse',
    build: (v) => v.ACSE_FILE ? toolBlock({
      title: 'ACSE (mod loader)',
      tool: 'ACSE',
      marker: v.ACSE_FILE,
    }) : null,
  },
  {
    fn: 'testAcseMod', engine: 'cobra-acse',
    build: (v) => v.ACSE_MOD_FILE ? matchBlock({
      title: 'ACSE Mods',
      lead: 'Lua mods that run under ACSE.',
      files: [v.ACSE_MOD_FILE],
      pitfalls: [`The archive must contain \`${v.ACSE_MOD_FILE}\` - ACSE identifies mods by that file.`],
    }) : null,
  },
  {
    fn: 'testOvlData', engine: 'cobra-acse',
    build: (v) => v.OVLDATA_FILE ? matchBlock({
      title: 'OVL Data Mods',
      lead: 'Packed Cobra Engine content.',
      files: [v.OVLDATA_FILE],
    }) : null,
  },

  // ── Shared across the non-Unreal engines ──────────────────────────────────
  {
    fn: 'testRoot', engine: NON_UE_ENGINES,
    build: (v) => {
      const folders = [...(v.ROOT_FOLDERS || []), ...(v.ROOTSUB_FOLDERS || [])];
      const block = matchBlock({
        title: 'Root / Game Folder Mods',
        lead: 'For mods laid out the same way the files appear inside the game folder. ' +
              'Vortex copies the matched folder and everything under it straight into the game.',
        folders,
        files: v.ROOT_FILES,
        exts: v.ROOT_EXTS,
        installsTo: 'the game folder itself (no subfolder)',
        targetIsProse: true,
        pitfalls: [
          'Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, ' +
            'adds an extra level and misplaces every file.',
        ],
      });
      if (block && folders.length) {
        block.tree = ['MyRootMod.zip', `└── ${folders[0]}\\`,
          '    └── ... files in their real relative locations'].join('\n');
      }
      return block;
    },
  },
  {
    fn: 'testSave', engine: NON_UE_ENGINES,
    build: (v) => matchBlock({
      title: 'Save Game Files',
      lead: 'Save files, deployed to the game\'s save folder.',
      userProfile: true,
      exts: v.SAVE_EXTS,
      pitfalls: ['Including an example save alongside a normal mod makes the archive install as a save.'],
    }),
  },
  {
    fn: 'testConfig', engine: NON_UE_ENGINES,
    build: (v) => matchBlock({
      title: 'Config File Mods',
      lead: 'Configuration tweaks, deployed to the game\'s config location.',
      userProfile: true,
      files: v.CONFIG_FILES,
      installsTo: v.CONFIG_PATH,
      pitfalls: [
        'Shipping a config file with one of these names inside an unrelated mod makes the whole ' +
          'archive install as a config mod.',
      ],
    }),
  },
  {
    fn: 'testFallback', engine: NON_UE_ENGINES,
    build: () => ({
      title: 'Fallback Installer',
      quick: 'anything not matched above',
      installsTo: null,
      lead: 'The catch-all. Any archive that matched none of the installers above lands here and is ' +
            'copied across unchanged.',
      rules: [
        'Reaching this installer usually means the archive was not laid out in a way Vortex recognised.',
        'Vortex shows the user a notification when a mod installs through the fallback.',
      ],
      pitfalls: [
        'If your mod lands here unintentionally, re-check the layouts above - users will see a ' +
          'fallback warning and may report the mod as broken.',
      ],
      warn: 'Landing in the fallback installer is a signal your archive layout needs fixing.',
    }),
  },
];

/** Resolve every constant the UE4-5 prose blocks reference. */
function buildVars(src, table) {
  const v = {};
  for (const n of ['EPIC_CODE_NAME', 'LOGICMODS_FOLDER', 'PAK_EXT', 'SCRIPTS_FOLDER',
    'SCRIPTS_EXT', 'DLL_FOLDER', 'DLL_EXT', 'UE4SS_FILE', 'SIGBYPASS_DLL',
    'SIGBYPASS_LUA', 'MODKITMOD_FILE', 'MODKITMOD_EXT', 'CONFIG_PATH',
    // Unity (BepInEx / MelonLoader)
    'BEPINEX_FOLDER', 'BEPINEX_DLL_FILE', 'BEPINEX_MOD_PATH', 'MELON_FOLDER',
    'MELON_DLL_FILE', 'MELON_MODS_PATH', 'MELON_PLUGINS_PATH', 'BEPCFGMAN_FILE',
    'BEPCFGMAN_PATH', 'MELONPREFMAN_FILE', 'MELONPREFMAN_PATH', 'ASSEMBLY_PATH',
    'ASSETS_PATH', 'PLUGIN_PATH', 'DATA_FOLDER',
    // Unity (Jiangyu - MENACE)
    'JIANGYU_FILE', 'JIANGYU_PATH', 'JIANGYUMOD_FILE', 'JIANGYUMOD_PATH',
    // Unity (Unity Mod Manager / Railloader)
    'UMM_INST_EXEC', 'UMM_MOD_FILE', 'MODS_FOLDER', 'RAILLOADER_MOD_FILE',
    // UE2-3 / TFC
    'TFC_EXEC', 'UPKEXPLORER_EXEC',
    // RE Engine / Fluffy
    'FLUFFY_EXEC', 'REF_FILE', 'LUA_EXT', 'FLUFFYMOD_FILE',
    // Anvil
    'ATK_EXEC', 'EXTRACTED_FOLDER', 'FORGEFOLDER_STRING', 'DATAFOLDER_STRING', 'FORGE_EXT',
    // Frostbite
    'FROSTY_EXEC',
    // Far Cry
    'MI_FILE', 'BIN_EXT', 'XML_FILE', 'MIMOD_FILEXML',
    // Reloaded-II
    'RELOADED_EXEC',
    // Cobra / ACSE
    'ACSE_FILE', 'ACSE_MOD_FILE', 'OVLDATA_FILE', 'LOCALISED_FILE',
    // Godot
    'MAPS_PATH', 'MAPS_FOLDER',
  ]) {
    v[n] = val(n, src, table);
  }
  for (const n of ['UE4SS_SUBFOLDERS', 'ROOT_FOLDERS', 'ROOTSUB_FOLDERS',
    'CONTENTSUB_FOLDERS', 'CONFIG_FILES', 'SAVE_EXTS', 'PAKMOD_EXTS',
    'ASSEMBLY_FILES', 'ASSETS_EXTS', 'PLUGIN_EXTS', 'ROOT_FILES', 'ROOT_EXTS',
    'TFCMOD_EXTS', 'TFCMOD_FILES', 'COOKEDSUB_FOLDERS', 'COOKEDSUB_EXTS',
    'MOVIES_EXTS', 'BINARIES_FILES', 'BINARIES_EXTS', 'DLCSUB_FOLDERS',
    'PRESET_EXTS', 'REF_FOLDERS', 'LOOSE_EXTS', 'FROSTYMOD_EXTS',
    'DATA_EXTS', 'MIMOD_EXTS', 'RAILLOADER_FILES', 'MAPS_EXTS']) {
    v[n] = resolveArray(n, src, table);
  }
  // Older/simpler extensions use singular names instead of the plural arrays.
  const singularFallbacks = [
    ['SAVE_EXTS', 'SAVE_EXT'],
    ['ROOT_FOLDERS', 'ROOT_FOLDER'],
    ['ASSEMBLY_FILES', 'ASSEMBLY_FILE'],
    ['PLUGIN_EXTS', 'PLUGIN_EXT'],
    ['ASSETS_EXTS', 'ASSETS_EXT'],
    ['MOVIES_EXTS', 'MOVIES_EXT'],
    ['DATA_EXTS', 'DATA_EXT'],
    ['CONFIG_FILES', 'CONFIG_FILE'],
  ];
  for (const [arrName, scalarName] of singularFallbacks) {
    if (!v[arrName] || !v[arrName].length) {
      const single = val(scalarName, src, table);
      if (single) v[arrName] = [single];
    }
  }
  // Loader marker files are named inconsistently across the Unity extensions.
  if (!v.BEPINEX_DLL_FILE) v.BEPINEX_DLL_FILE = val('BEPINEX_FILE', src, table);
  if (!v.MELON_DLL_FILE) v.MELON_DLL_FILE = val('MELON_FILE', src, table);
  // PAKMOD_EXTS is built as ['.pak'].concat(PAKMOD_EXTRA_EXTS)
  if (!v.PAKMOD_EXTS.length) {
    const extra = resolveArray('PAKMOD_EXTRA_EXTS', src, table);
    v.PAKMOD_EXTS = ['.pak', ...extra];
  }
  // Legacy Unreal extensions keep their pak settings on an UNREALDATA object.
  // `fileExt` is usually a reference to an array constant rather than a literal.
  v.UNREAL_MODS_PATH = val('UNREALDATA.modsPath', src, table);
  v.UNREAL_FILE_EXTS = resolveObjArray('UNREALDATA', 'fileExt', src, table);
  // Deploy targets. These resolve far more often than spec.modTypes targetPath,
  // which is frequently a function rather than a literal.
  for (const n of ['PAKMOD_PATH', 'SCRIPTS_PATH', 'DLL_PATH', 'BINARIES_PATH',
    'LOGICMODS_PATH', 'UE4SS_MOD_PATH']) {
    v[n] = val(n, src, table);
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
  const declRe = new RegExp(`^(?:async\\s+)?function\\s+${name}\\s*\\(`, 'm');
  let m = declRe.exec(src);
  if (m) {
    const rest = src.slice(m.index + m[0].length);
    const nm = /^(?:async\s+)?function\s+\w+\s*\(/m.exec(rest);
    return nm ? rest.slice(0, nm.index) : rest;
  }
  // Arrow assigned to a const/let, often nested inside main():
  //   const testForUnrealMod = (files, gameId) => { ... };
  const arrowRe = new RegExp(`(?:const|let)\\s+${name}\\s*=\\s*(?:async\\s*)?\\(`, '');
  m = arrowRe.exec(src);
  if (m) {
    const rest = src.slice(m.index + m[0].length);
    // Delimit on the next sibling declaration or top-level function.
    const nm = /(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\(|^(?:async\s+)?function\s+\w+\s*\(/m.exec(rest);
    return nm ? rest.slice(0, nm.index) : rest;
  }
  return null;
}

/**
 * Read the recognisable file/folder conditions out of a test function body.
 * Returns human-readable phrases; unrecognised logic simply yields nothing,
 * so the section degrades to a bare priority note rather than saying anything false.
 */
function deriveTrigger(body, src, table) {
  const out = [];
  const seen = new Set();
  const add = (s) => { if (s && !seen.has(s)) { seen.add(s); out.push(s); } };

  // path.basename(...) === CONST  ->  file or folder with that name
  for (const m of body.matchAll(/path\.basename\([^)]*\)(?:\.toLowerCase\(\))?\s*===\s*([A-Za-z_$][\w.]*|'[^']*'|"[^"]*")(?:\.toLowerCase\(\))?/g)) {
    const raw = m[1];
    if (/^(gameId|spec)/.test(raw)) continue;
    const value = resolveWithFallback(raw, table, src);
    if (value && value !== raw && !String(value).includes('${') && value !== 'moduleconfig.xml') {
      add(`a file or folder named \`${value}\``);
    }
  }
  // path.extname(...) === CONST  ->  file with that extension
  for (const m of body.matchAll(/path\.extname\([^)]*\)(?:\.toLowerCase\(\))?\s*===\s*([A-Za-z_$][\w.]*|'[^']*'|"[^"]*")/g)) {
    const value = resolveWithFallback(m[1], table, src);
    if (value && value !== m[1] && !String(value).includes('${')) {
      add(`a file with the \`${value}\` extension`);
    }
  }
  // ARRAY.includes(path.basename/extname(...))
  for (const m of body.matchAll(/([A-Z][A-Z0-9_]*)(?:_LOWER)?\.includes\(\s*path\.(basename|extname)\(/g)) {
    const arrName = m[1].replace(/_LOWER$/, '');
    const items = resolveArray(arrName, src, table);
    if (items.length) {
      add(m[2] === 'extname'
        ? `a file with one of these extensions: ${orList(items)}`
        : `a file or folder named one of: ${orList(items)}`);
    }
  }
  return out;
}

// ── rendering ───────────────────────────────────────────────────────────────

const SEP = '='.repeat(72);

const GAME_FOLDER_PROSE = 'the game folder itself (no subfolder)';

/** Format a deploy target: real paths get code formatting, prose does not. */
function fmtTarget(s) {
  if (!s.target) return '-';
  const t = String(s.target);
  // '.' is the game folder root; showing it as a path is meaningless.
  if (s.targetIsProse || t === GAME_FOLDER_PROSE || t === '.') {
    return t === '.' ? GAME_FOLDER_PROSE : t;
  }
  return `\`${disp(t)}\``;
}

function renderMarkdown(ctx) {
  const { title, gameName, sections, fallbackNote } = ctx;
  let md = `# ${title}\n\n`;
  md += `Packaging rules for ${gameName} mods, so Vortex installs them to the right place.\n\n`;
  md += `Vortex decides what a mod is by looking at the files and folders inside the archive. ` +
        `It tries each installer in order and the first one that matches wins, so archive layout is what ` +
        `determines where your mod ends up.\n\n`;
  md += `## Quick Reference\n\n`;
  md += `| Mod Type | Archive must contain | Installs to |\n| --- | --- | --- |\n`;
  for (const s of sections) {
    md += `| ${s.title} | ${s.quickTrigger || '-'} | ${fmtTarget(s)} |\n`;
  }
  md += `\nPaths are relative to the game's install folder.`;
  // Only mention the user-profile exception when a mod type actually deploys there. Games
  // with no config or save mod type were being told about a rule that does not apply to them.
  if (sections.some(s => s.userProfile)) {
    md += ` Config and save mods deploy into your ` +
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
    if (s.target) md += `Installs to: ${fmtTarget(s)}\n\n`;
    if (s.pitfalls && s.pitfalls.length) {
      md += `**Common mistakes:**\n\n`;
      for (const p of s.pitfalls) md += `- ${p}\n`;
      md += `\n`;
    }
  }

  md += `## Rules That Apply To Every Mod Type\n\n`;
  if (ctx.allFomodGuarded) {
    md += `- Archives that contain a FOMOD installer (a \`fomod\` folder with \`ModuleConfig.xml\`) are handed to ` +
          `Vortex's built-in FOMOD installer instead, and none of the rules above apply.\n`;
  }
  md += `- Folder and file name matching is case-insensitive.\n`;
  md += `- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.\n`;
  if (fallbackNote) md += `- ${fallbackNote}\n`;
  md += `\n`;
  return md;
}

function renderBBCode(ctx) {
  const { title, gameName, sections } = ctx;
  const L = [];
  L.push(`[b][color=#e69138][size=4]${title}[/size]`);
  L.push(`[/color][/b]Packaging rules for ${gameName} mods, so Vortex installs them to the right place.`);
  L.push('');
  L.push('Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.');
  L.push('');
  L.push(SEP);
  L.push('');

  for (const s of sections) {
    L.push(`${s.title}:`);
    if (s.lead) { L.push(''); L.push(stripMd(s.lead)); }
    if (s.warn) { L.push(''); L.push(`[b][color=#ffff00]NOTE: ${stripMd(s.warn)}[/color][/b]`); }
    if (s.tree) { L.push(''); L.push('[code]'); L.push(s.tree); L.push('[/code]'); }
    if (s.rules && s.rules.length) {
      L.push('');
      L.push('  Requirements:');
      for (const r of s.rules) L.push(`    - ${stripMd(r)}`);
    }
    if (s.target) { L.push(''); L.push(`  Installs to: ${stripMd(fmtTarget(s))}`); }
    if (s.pitfalls && s.pitfalls.length) {
      L.push('');
      L.push('  Common mistakes:');
      for (const p of s.pitfalls) L.push(`    - ${stripMd(p)}`);
    }
    L.push('');
    L.push(SEP);
    L.push('');
  }

  L.push('Rules That Apply To Every Mod Type:');
  L.push('');
  if (ctx.allFomodGuarded) {
    L.push('    - Archives containing a FOMOD installer (a "fomod" folder with ModuleConfig.xml) are handed to the built-in FOMOD installer instead.');
  }
  L.push('    - Folder and file name matching is case-insensitive.');
  L.push('    - Extra wrapper folders around a recognised folder are generally fine.');
  L.push('');
  return L.join('\n');
}

/** BBCode has no inline code span - drop markdown backticks and bold. */
function stripMd(s) {
  return String(s).replace(/`/g, '"').replace(/\*\*/g, '');
}

/**
 * `a "info.json" file` reads badly - fix the article ahead of a vowel sound.
 * `u` is excluded on purpose: every u-initial token these lines carry is a
 * consonant sound ("a UnityModManager.exe file", "a UE4SS folder").
 */
function fixArticle(s) {
  return String(s).replace(/\ba (?=["']?[aeioAEIO])/g, 'an ');
}

/**
 * One line per installer, for the "Mod Installation Notes" list on a Nexus mod page.
 * Same sections the notes are built from, collapsed to trigger + destination:
 *   [*]Installs mods with an "info.json" file to the "Mods" folder.[/*]
 * Loader installers (the ones whose section carries a tool lead) are marked so the
 * author can move them to the top of the list, where the house style puts them.
 */
const DESCRIPTION_FILE = 'DESCRIPTION.bbcode.txt';
const INSTALL_HEADING = '[b]🛠️ Mod Installation Notes:[/b]';

function renderDescription(ctx) {
  const { sections, allFomodGuarded } = ctx;
  const L = [];
  L.push(INSTALL_HEADING);
  L.push('[list]');
  for (const s of sections) {
    const trigger = s.quickTrigger && s.quickTrigger !== '-'
      ? fixArticle(stripMd(s.quickTrigger))
      : null;
    const rawTarget = fmtTarget(s);
    const target = rawTarget === '-' ? null
      : (s.targetIsProse || rawTarget === GAME_FOLDER_PROSE)
        ? rawTarget
        : `the ${stripMd(rawTarget)} folder`;
    // A tool installer handles the loader/manager itself, so "installs mods with" is wrong for it.
    const isTool = s.lead && /not mods for it/i.test(s.lead);
    // The catch-all installer has no trigger worth naming and usually no mod type.
    const isFallback = trigger && /anything not matched/i.test(trigger);
    let line;
    if (isFallback) {
      line = `Any other mod not described above is installed to ${target || GAME_FOLDER_PROSE}.`;
    } else if (isTool) {
      // Section titles carry a "(tool)" / "(mod loader)" qualifier that reads as clutter here.
      const toolName = s.title.replace(/\s*\([^)]*\)\s*$/, '');
      line = target
        ? `Installs ${toolName} itself to ${target}, recognised by ${trigger || 'its own files'}.`
        : `Installs ${toolName} itself, recognised by ${trigger || 'its own files'}.`;
    } else if (trigger && target) {
      line = `Installs mods with ${trigger} to ${target}.`;
    } else if (trigger) {
      line = `Installs mods with ${trigger}.`;
    } else if (target) {
      line = `${s.title} mods are installed to ${target}.`;
    } else {
      line = `${s.title} mods are recognised by the ${s.title} installer.`;
    }
    L.push(`[*]${line}[/*]`);
  }
  if (allFomodGuarded) {
    L.push('[*]Archives with a FOMOD installer (a "fomod" folder with ModuleConfig.xml) are handed to Vortex\'s built-in FOMOD installer instead.[/*]');
  }
  L.push('[/list]');
  return L.join('\n');
}

/** Store label per resolved app-id constant, in the order the pages list them. */
const STORE_IDS = [
  ['STEAMAPP_ID', 'Steam'],
  ['GOGAPP_ID', 'GOG'],
  ['EPICAPP_ID', 'Epic'],
  ['UPLAYAPP_ID', 'Ubisoft Connect'],
  ['EAAPP_ID', 'EA'],
  ['XBOXAPP_ID', 'Xbox (Game Pass)'],
];

/** Donation block, byte-identical across every published extension page. */
const SUPPORT_BLOCK = [
  '[b]❤️ Support the Mod Author: [/b]',
  'If you would like to support my work, you can do so below. Your support is greatly appreciated!',
  '',
  '',
  '[url=https://www.paypal.com/donate/?hosted_button_id=ZFE99JKP43D2G][img]https://live.staticflickr.com/65535/54395661414_10e6ef111d_m.jpg[/img][/url]',
  '',
  '',
  '[url=https://ko-fi.com/chemboy1nexusmods/][img]https://live.staticflickr.com/65535/54380730333_357df43249_n.jpg[/img][/url]',
  '',
  '',
  '[url=https://buymeacoffee.com/chemboy1/][img]https://live.staticflickr.com/65535/54379586002_8dcc6370e5_m.jpg[/img][/url]',
].join('\n');

/**
 * Whole-page scaffold, used only when no DESCRIPTION.bbcode.txt exists yet. Follows
 * the section order every published extension page uses. The parts a generator cannot
 * know - loader warnings, per-game usage notes, credits - are left for the author.
 */
function scaffoldDescription(ctx, installBlock) {
  const stores = STORE_IDS
    .filter(([name]) => isRealValue(ctx.table.get(name)))
    .map(([, label]) => label);
  const L = [];
  L.push(`This extension adds ${ctx.gameName} modding support to Vortex Mod Manager.`);
  L.push('');
  L.push('[b]✅ Supported Versions:[/b]');
  L.push('[list]');
  for (const s of stores) L.push(`[*]${s}[/*]`);
  L.push('[*]Other versions may need to select the installation location manually.[/*]');
  L.push('[/list]');
  L.push(installBlock);
  L.push('[b]📋 Usage Notes:[/b]');
  L.push('[list]');
  L.push('[*]You can open several useful files/folders/URLs using the buttons within the folder icon on the Mods toolbar.[/*]');
  L.push('[/list]');
  L.push('');
  L.push(SUPPORT_BLOCK);
  L.push('');
  return L.join('\n');
}

/**
 * Replace just the install list inside a page that already exists, from the heading
 * through its closing [/list]. Everything the author wrote around it survives.
 * Returns null when the heading is absent, so the caller can refuse rather than
 * overwrite a page laid out some other way.
 *
 * Items carrying BBCode markup are kept and moved to the top of the rebuilt list.
 * Those are the lines no generator can produce - the yellow "downloaded automatically"
 * loader line, a red caveat - and the house style already puts them first. Generated
 * lines are always plain text, so nothing is duplicated by keeping them.
 */
const AUTHOR_ITEM = /\[(?:b|i|u|color|size|url|img)[=\]]/i;

function spliceDescription(existing, installBlock) {
  const start = existing.indexOf(INSTALL_HEADING);
  if (start === -1) return null;
  const listEnd = existing.indexOf('[/list]', start);
  if (listEnd === -1) return null;
  const oldItems = existing.slice(start, listEnd).match(/^\[\*\].*$/gm) || [];
  const kept = oldItems.filter(item => AUTHOR_ITEM.test(item));
  const lines = installBlock.split('\n');
  const listOpen = lines.indexOf('[list]');
  if (kept.length && listOpen !== -1) lines.splice(listOpen + 1, 0, ...kept);
  return existing.slice(0, start) + lines.join('\n') + existing.slice(listEnd + '[/list]'.length);
}

// ── per-extension build ─────────────────────────────────────────────────────

function buildNotes(dirName, src) {
  const table = buildSymbolTable(src);
  const header = parseHeader(src);
  const engine = detectEngine(dirName);
  const installers = extractInstallers(src, table);
  const modTypes = [...extractModTypes(src, table), ...extractRegisterModTypes(src, table)];
  const vars = buildVars(src, table);

  const isTemplate = dirName.startsWith('template-');
  let gameName = (header.name || dirName)
    .replace(/\s*Vortex Extension\s*$/i, '')
    .trim() || dirName;
  // Templates carry XXX placeholders instead of a real game name.
  if (isTemplate || !gameName || gameName === 'XXX') {
    gameName = isTemplate ? `${dirName} (template)` : dirName;
  }

  // Only claim FOMOD passthrough when every registered installer actually checks
  // for fomod/ModuleConfig.xml - it is near-universal but not guaranteed.
  const allFomodGuarded = installers.length > 0 && installers.every(inst => {
    if (!inst.testFn) return false;
    const body = sliceFunction(src, inst.testFn);
    return !!body && /moduleconfig\.xml/i.test(body);
  });

  const targetById = new Map();
  for (const mt of modTypes) {
    if (mt.id && mt.targetPath && !String(mt.targetPath).includes('${')) {
      targetById.set(mt.id, String(mt.targetPath).replace(/^\{gamePath\}[\\/]?/, ''));
    }
  }

  const sorted = installers.slice().sort((a, b) => Number(a.priority) - Number(b.priority));

  const sections = [];
  let tier1 = 0, tier2 = 0;
  const unknownFns = [];

  for (const inst of sorted) {
    // A block pinned with `game` applies to that one extension folder only. Needed where a test
    // function name is shared across extensions that have no engine key to tell them apart.
    const block = PROSE.find(p => p.fn === inst.testFn && (p.game !== undefined
      ? p.game === dirName
      : (Array.isArray(p.engine) ? p.engine.includes(engine) : p.engine === engine)));
    let section = null;
    if (block) {
      const built = block.build(vars);
      if (built) { section = built; tier1++; }
    }
    if (!section) {
      // Tier 2 - derive what we can from the test function itself.
      const body = inst.testFn ? sliceFunction(src, inst.testFn) : null;
      const triggers = body ? deriveTrigger(body, src, table) : [];
      const name = (targetById.has(inst.id) ? null : null) ||
        prettifyId(inst.id, dirName);
      section = {
        title: name,
        lead: triggers.length
          ? `Recognised when the archive contains ${joinAnd(triggers)}.`
          : `Handled by the \`${inst.testFn || inst.id}\` installer. ` +
            `Inspect the extension source for the exact archive layout it expects.`,
        rules: [],
        pitfalls: [],
      };
      tier2++;
      if (inst.testFn) unknownFns.push(inst.testFn);
    }
    section.target = section.installsTo || targetById.get(inst.id) || null;
    section.quickTrigger = quickTrigger(section);
    sections.push(section);
  }

  const title = `Notes for Mod Authors - ${gameName}`;
  const ctx = { title, gameName, sections, allFomodGuarded, table };
  const installBlock = renderDescription(ctx);
  return {
    md: renderMarkdown(ctx),
    bbcode: renderBBCode(ctx),
    description: installBlock,
    scaffold: () => scaffoldDescription(ctx, installBlock),
    tier1, tier2, unknownFns,
  };
}

/** One-line trigger for the quick-reference table. */
function quickTrigger(section) {
  if (section.quick) return stripTableCell(section.quick);
  if (section.lead) {
    const m = section.lead.match(/Recognised when the archive contains (.+?)\.$/);
    if (m) return stripTableCell(m[1]);
  }
  return '-';
}

function stripTableCell(s) {
  return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function joinAnd(items) {
  if (items.length === 1) return items[0];
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

/** Turn `subnautica2-logicmods` into `Logic Mods` when no prose block exists. */
function prettifyId(id, dirName) {
  if (!id) return 'Mod';
  const gameId = dirName.replace(/^game-/, '');
  let s = String(id).replace(new RegExp(`^${gameId}-?`), '').replace(/^-/, '');
  if (!s) s = String(id);
  s = s.replace(/[-_]+/g, ' ').trim();
  return s.replace(/\b\w/g, c => c.toUpperCase()) || String(id);
}

// ── CLI ─────────────────────────────────────────────────────────────────────

const rawArgs     = process.argv.slice(2);
const cliFlags    = new Set(rawArgs.filter(a => a.startsWith('--')));
const gameArgs    = rawArgs.filter(a => !a.startsWith('--'));
const doJson      = cliFlags.has('--json');
const doTemplates = cliFlags.has('--templates');
const doDescription = cliFlags.has('--description');
const jsonResults = [];

function emit(line = '') {
  if (doJson) process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

const entries = fs.readdirSync(ROOT, { withFileTypes: true });
let extDirs = entries
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .filter(n => n.startsWith('game-') || (doTemplates && n.startsWith('template-')))
  .sort();

if (gameArgs.length > 0) {
  const wanted = new Set(gameArgs.map(a => a.replace(/^(game|template)-/, '')));
  extDirs = entries
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .filter(n => (n.startsWith('game-') || n.startsWith('template-')) &&
                 wanted.has(n.replace(/^(game|template)-/, '')))
    .sort();
}

let created = 0, skipped = 0, errors = 0, tier1Total = 0, tier2Total = 0;
const tier2Heavy = [];

for (const dir of extDirs) {
  const indexPath = path.join(ROOT, dir, 'index.js');
  if (!fs.existsSync(indexPath)) {
    emit(`  SKIP  ${dir} (no index.js)`);
    skipped++;
    jsonResults.push({ id: dir, ok: false, error: 'no index.js' });
    continue;
  }
  try {
    const src = fs.readFileSync(indexPath, 'utf8');
    const { md, bbcode, description, scaffold, tier1, tier2, unknownFns } = buildNotes(dir, src);
    if (doDescription) {
      // The page is hand-written around this list, so an existing file is spliced,
      // never rewritten. Only a brand new page gets the full scaffold.
      const descPath = path.join(ROOT, dir, DESCRIPTION_FILE);
      if (fs.existsSync(descPath)) {
        const existing = fs.readFileSync(descPath, 'utf8');
        const merged = spliceDescription(existing, description);
        if (merged === null) {
          emit(`  SKIP  ${dir} (${DESCRIPTION_FILE} has no "${INSTALL_HEADING}" list to replace)`);
          skipped++;
          jsonResults.push({ id: dir, ok: false, error: 'no install list heading' });
          continue;
        }
        if (merged === existing) {
          emit(`  OK    ${dir} (${DESCRIPTION_FILE} already up to date)`);
        } else {
          fs.writeFileSync(descPath, merged);
          emit(`  OK    ${dir} (${DESCRIPTION_FILE} install list updated)`);
        }
      } else {
        fs.writeFileSync(descPath, scaffold());
        emit(`  NEW   ${dir} (${DESCRIPTION_FILE} scaffolded - fill in the loader, usage and credit lines)`);
      }
      created++;
      jsonResults.push({ id: dir, ok: true, description: true });
      continue;
    }
    fs.writeFileSync(path.join(ROOT, dir, 'NOTES_FOR_MOD_AUTHORS.md'), md);
    fs.writeFileSync(path.join(ROOT, dir, 'NOTES_FOR_MOD_AUTHORS.bbcode.txt'), bbcode);
    created++;
    tier1Total += tier1;
    tier2Total += tier2;
    if (tier2 > 0 && tier1 === 0) tier2Heavy.push(dir);
    const note = tier2 > 0 ? `  (${tier1} documented, ${tier2} auto-derived)` : `  (${tier1} documented)`;
    emit(`  OK    ${dir}${note}`);
    jsonResults.push({ id: dir, ok: true, tier1, tier2, unknownFns });
  } catch (err) {
    emit(`  ERROR ${dir}: ${err.message}`);
    errors++;
    jsonResults.push({ id: dir, ok: false, error: err.message });
  }
}

emit('');
emit(`Done.  Written: ${created}  Skipped: ${skipped}  Errors: ${errors}`);
if (!doDescription) emit(`Sections: ${tier1Total} documented, ${tier2Total} auto-derived`);
if (tier2Heavy.length) {
  emit(`Extensions with no documented sections yet: ${tier2Heavy.length}`);
}

if (doJson) {
  process.stdout.write(JSON.stringify({
    timestamp: new Date().toISOString(),
    created, skipped, errors,
    tier1: tier1Total, tier2: tier2Total,
    results: jsonResults,
  }, null, 2) + '\n');
}

process.exit(errors > 0 ? 1 : 0);
