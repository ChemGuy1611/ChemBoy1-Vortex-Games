# File Parsing (INI / XML / YAML / TOML / JSON)

Reading and writing structured config/data files from extension code — game config INI files, FOMOD/appxmanifest XML, load-order YAML, mod-loader TOML, mod-kit JSON manifests. Each format has its own library (JSON is the exception — built into the JS runtime); none of them go through `vortex-api` directly, they're plain `require()`s.

```js
const { default: IniParser, WinapiFormat } = require('vortex-parse-ini'); // .ini
const { parseStringPromise, Builder } = require('xml2js');                // .xml
const YAML = require('js-yaml');                                          // .yaml/.yml
const TOML = require('@iarna/toml');                                      // .toml
// JSON.parse / JSON.stringify — no require() needed, global on every JS runtime
```

---

## Availability — not all of these are guaranteed

These packages aren't dependencies of this repo — they resolve at runtime because the extension executes inside Vortex's own process, which bundles them. Checked against the Vortex monorepo's actual `package.json` files:

| Package | Declared by | Guaranteed? |
| --- | --- | --- |
| `JSON` (built-in) | Node/V8 itself | Yes — always available, no `require()`, no version to track |
| `xml2js` | `src/main` (also a direct dep of this repo, for local dev/lint) | Yes — core app dependency |
| `vortex-parse-ini` | `src/main` | Yes — core app dependency |
| `winapi-bindings` | `src/main` | Yes — core app dependency |
| `js-yaml` | Only the bundled `gamebryo-plugin-management` extension | No — works today only because Node hoists it somewhere `require()` can find; not a stable contract |
| `@iarna/toml` | Only the bundled `modtype-bepinex` extension | No — same caveat |

**Practical effect:** `xml2js`, `vortex-parse-ini`, `winapi-bindings` are safe to depend on in any extension. `js-yaml` and `@iarna/toml` currently work (multiple shipping extensions in this repo use `js-yaml` this way already), but a future Vortex release that changes those two bundled extensions' dependencies could silently break resolution. There's no first-party alternative for YAML/TOML today, so this is a known, accepted risk rather than something to work around.

---

## INI — `vortex-parse-ini`

```js
const parser = new IniParser(new WinapiFormat());

const contents = await parser.read(iniPath);   // returns an IniFile wrapper
const data = contents.data;                     // { SectionName: { Key: 'value', ... }, ... }

data.SectionName.SomeKey = 'newValue';          // mutate in place — nested keys must already exist
await parser.write(iniPath, contents);          // pass the IniFile wrapper, not `data`
```

- `parser.read(path)` resolves to an `IniFile` instance, not a plain object. `.data` is a getter that lazily deep-clones the parsed sections into a mutable copy the first time it's accessed, then returns that same reference on every subsequent access — so grabbing `const data = contents.data` once and mutating nested properties on it is tracked correctly.
- `parser.write(path, contents)` needs the whole `IniFile` object. Internally it diffs the mutable copy against the original snapshot (`contents.changes()`), writes only the added/changed/removed keys, then calls `contents.apply()` to reset the snapshot. Passing `data` instead of `contents` will fail — `data` has no `.changes()`.
- Only keys that actually differ get written; unrelated values in the file are left untouched.

### Section-may-not-exist pattern

If you can't guarantee a section exists in the target file (a third-party config, as opposed to a known-good default shipped by a mod tool), guard the assignment:

```js
let content = await parser.read(iniPath);
try {
  content.data[SECTION][KEY] = SET_VALUE;
} catch {
  content.data = {
    ...content.data,
    [SECTION]: { [KEY]: SET_VALUE },
  };
}
await parser.write(iniPath, content);
```

If the section is known to always ship with the default keys present (e.g. a tool's own settings file, even with blank values), direct dot-path assignment is safe without the guard:

```js
const contents = await parser.read(iniPath);
contents.data.EngineVersionOverride.MajorVersion = '5';
contents.data.EngineVersionOverride.MinorVersion = '7';
await parser.write(iniPath, contents);
```

`parser.read()` on a missing file resolves to an empty object rather than throwing, so check existence first (`fs.statAsync`) if you need to distinguish "file missing" from "file empty".

### Native binding notes (winapi-bindings)

| Behavior | Detail |
| --- | --- |
| Writing `null`/`undefined` as a value | Deletes the key (maps to Win32 passing a `NULL` value string) |
| Missing file on write | `WritePrivateProfileString` creates the file if the parent directory exists |
| Missing file on read | Resolves with no sections / empty string, does not throw |
| Section/key-name buffer size | `GetPrivateProfileSection` / `GetPrivateProfileSectionNames` use a fixed ~32K wide-char buffer with no resize — extremely large sections or very many section names can silently truncate |

---

## XML — `xml2js`

```js
const { parseStringPromise, Builder } = require('xml2js');

const xmlText = await fs.readFileAsync(manifestPath, 'utf8');
const parsed = await parseStringPromise(xmlText);
const version = parsed?.Package?.Identity?.[0]?.$?.Version;
```

Real example from this codebase — reading a Xbox `appxmanifest.xml` for the installed game version:

```js
const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
const parsed = await parseStringPromise(appManifest);
const version = parsed?.Package?.Identity?.[0]?.$?.Version;
```

**Default parsing shape (both matter, and both are easy to get wrong):**

- Every child element becomes an **array**, even when there's only one occurrence — `parsed.Package.Identity` is `[{...}]`, not `{...}`. Always index `[0]` (or pass `{ explicitArray: false }` to `parseStringPromise` if you'd rather have singles unwrapped).
- XML attributes land under a `$` key, not merged into the element object — `<Identity Version="1.0"/>` becomes `{ $: { Version: '1.0' } }`, so the attribute is `parsed.Package.Identity[0].$.Version`, not `parsed.Package.Identity[0].Version`.

### Writing XML

```js
const builder = new Builder();
const xmlString = builder.buildObject({ Root: { Item: [{ $: { id: '1' } }] } });
```

`Builder#buildObject` expects the same shape `parseStringPromise` produces (arrays for repeatable elements, `$` for attributes) — build the object as if you'd just parsed the desired output.

---

## YAML — `js-yaml`

```js
const YAML = require('js-yaml');
const parsed = YAML.load(fileText);   // string -> JS value (object/array/scalar)
const text = YAML.dump(value);        // JS value -> string
```

Real example from this codebase — a pak-based load order file (`pak_config.yaml`) storing an ordered array of `{ pak, disabled }` entries:

```js
const loadOrderFile = await fs.readFileAsync(loadOrderPath, { encoding: 'utf8' });
let modEntries = YAML.load(loadOrderFile);
if (modEntries === undefined) modEntries = []; // YAML.load returns undefined for an empty file

// ...mutate the array...

const loadOrderMapped = loadOrder.map(mod => ({ pak: mod.id, disabled: !mod.enabled }));
const output = YAML.dump(loadOrderMapped);
await fs.writeFileAsync(loadOrderPath, output, { encoding: 'utf8' });
```

No wrapper class like `vortex-parse-ini`'s `IniFile` — `load`/`dump` operate on plain strings/values, so read the file yourself with `fs.readFileAsync`/`writeFileAsync` around the calls. `YAML.load` on an empty string returns `undefined`, not `{}`/`[]` — guard for that before using array/object methods on the result.

`js-yaml` v4's `load`/`dump` are the safe-by-default versions (the old `safeLoad`/`safeDump` names from v3 no longer exist).

---

## TOML — `@iarna/toml`

```js
const TOML = require('@iarna/toml');
const parsed = TOML.parse(fileText);   // string -> JS object
const text = TOML.stringify(value);    // JS object -> string
```

Same plain read/parse/mutate/stringify/write cycle as YAML above — no wrapper, no diffing, round-trip the whole file. Used by mod-loader-style config files (e.g. BepInEx `.cfg`-adjacent TOML configs) in the wider Vortex ecosystem; no live example in this repo yet beyond the prototype in `resources/snippets.js`.

---

## JSON — built-in `JSON.parse` / `JSON.stringify`

```js
const parsed = JSON.parse(fs.readFileSync(jsonPath));    // no encoding needed — JSON.parse stringifies a Buffer for you
fs.writeFileSync(jsonPath, JSON.stringify(value, null, 2), { encoding: 'utf8' }); // 2-space indent = human-readable convention
```

No import, no availability question — it's part of the language, not a package. Two real patterns from this codebase:

**Installer-time read** (used identically across ~25 UE5 game extensions installing mod-kit packages) — read a manifest shipped inside the mod archive to get the correct install folder name, since some of these games crash if the on-disk folder name doesn't match what's inside the file:

```js
try {
  const JSON_OBJECT = JSON.parse(fs.readFileSync(path.join(fileName, rootPath, MODKITMOD_FILE)));
  MOD_FOLDER = JSON_OBJECT['modPluginName'];
} catch {
  log('error', `Could not read mod.json file for mod ${MOD_NAME}.`);
  // fall through to a folder name derived from the archive name instead
}
```

**Setup-time read-or-seed-default** (game-dragonballsparkingzero, a JSON manifest listing active patch files) — check for the file, parse it if present, otherwise write a fresh default:

```js
try {
  fs.statSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE));
  JSONFILES_JSON = JSON.parse(fs.readFileSync(path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE)));
} catch {
  await fs.writeFileAsync(
    path.join(GAME_PATH, JSON_PATH, JSONFILES_FILE),
    `${JSON.stringify(DEFAULT_JSON, null, 2)}`,
    { encoding: 'utf8' },
  );
}
```

- `JSON.parse` throws `SyntaxError` on malformed or empty content — both real examples above wrap it in try/catch; there's no soft-fail mode.
- `JSON.parse` accepts a `Buffer` directly (as in both examples — no `'utf8'` passed to `readFileSync`) because it coerces its argument to a string first; the other three formats' parsers are pickier about being handed an actual string, so keep passing explicit `'utf8'` encoding for those even though JSON tolerates skipping it.
- No comment syntax — unlike INI (`;`), TOML/YAML (`#`), plain JSON has none. Don't hand-author JSON files expecting to leave notes in them (JSON5/JSONC aren't in use here).
- `resources/RE-UE4SS_MODS_CONFIG.md` documents one specific JSON-shaped file in depth (UE4SS's `mods.json`) if you're touching that particular format.

---

## Notes

- Pick the format based on what the target file actually is — don't convert a game's native config format to something else; write back in the same format it was read in.
- INI is the only one of these with change-diffing (`vortex-parse-ini`'s `IniFile`); XML/YAML/TOML/JSON here are all read-whole-file / write-whole-file — there's no partial-write native binding backing them the way INI has `WritePrivateProfileString`.
- Always pass the full `IniFile` wrapper to `vortex-parse-ini`'s `write()` — never `contents.data`.
- Treat `js-yaml`/`@iarna/toml` availability as best-effort (see the availability table above) — don't add a hard runtime dependency on them without a fallback path if the parse `require()` throws. `JSON` has no such caveat.
- `JSON.stringify(value, null, 2)` is this codebase's convention for human-readable output — keep the 2-space indent when writing a JSON file a modder might open by hand.
