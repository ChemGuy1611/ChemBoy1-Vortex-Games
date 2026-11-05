# RE-UE4SS Mod Configuration: mods.json vs mods.txt

## Summary

`mods.txt` is what UE4SS **reads at runtime**. `mods.json` mirrors it in JSON and is never read by the runtime — but it makes a useful **intermediary write target** for Vortex extensions: read/merge mod lists as JSON, then serialize to `mods.txt` before the game launches.

---

## Runtime: `mods.txt`

Read by `UE4SSProgram::start_mods()` at game launch. Controls which mods start and in what order.

**Format:**

```text
ModName : 1
ModName : 0
```

`1` = enabled, `0` = disabled. Order in the file = load order.

**Three-tier startup priority:**

1. Listed in `mods.txt` with `: 1` — explicit load order preserved
2. Has `enabled.txt` in the mod's own folder — starts but no guaranteed order
3. Neither — mod is installed but not started

---

## `mods.json`: structure and role

Located at `assets/Mods/mods.json` in the RE-UE4SS repo. Structurally mirrors `mods.txt` but in JSON.

**Format:**

```json
[
    { "mod_name": "ConsoleEnablerMod", "mod_enabled": true },
    { "mod_name": "ActorDumperMod", "mod_enabled": false }
]
```

In the RE-UE4SS repo itself it is used by `tools/buildscripts/release.py` during release packaging:

| Function             | What it does                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `modify_mods_txt()`  | Rewrites `mods.txt`: injects C++ mod entries, strips dev-only mods, flips disabled states |
| `modify_mods_json()` | Mirrors those same changes into `mods.json` to keep the two files in sync                 |

`mods.json` is never read by the UE4SS C++ runtime.

---

## Vortex Extension Workflow

Vortex extensions should use `mods.json` as an **intermediary** and then convert it to `mods.txt`:

1. **Read** the deployed `mods.json` (easier to parse and merge than `mods.txt`)
2. **Mutate** the JSON array — add entries, flip `mod_enabled`, reorder
3. **Write** `mods.json` back (optional, keeps the two files in sync)
4. **Serialize** to `mods.txt` — UE4SS reads only this file at launch

**Conversion snippet (JS):**

```js
const fsp = require("fs").promises;
const path = require("path");

async function writeModysTxt(modsJsonPath) {
    const raw = await fsp.readFile(modsJsonPath, "utf8");
    const entries = JSON.parse(raw);
    const lines = entries.map((e) => `${e.mod_name} : ${e.mod_enabled ? 1 : 0}`);
    const txtPath = path.join(path.dirname(modsJsonPath), "mods.txt");
    await fsp.writeFile(txtPath, lines.join("\n") + "\n");
}
```

---

## Default bundled mods (from `assets/Mods/mods.json`)

| Mod                    | Enabled by default |
| ---------------------- | ------------------ |
| CheatManagerEnablerMod | true               |
| ActorDumperMod         | false              |
| ConsoleCommandsMod     | true               |
| ConsoleEnablerMod      | true               |
| SplitScreenMod         | false              |
| LineTraceMod           | true               |
| BPML_GenericFunctions  | true               |
| BPModLoaderMod         | true               |
| jsbLuaProfilerMod      | false              |
| Keybinds               | true               |

---

## How BPModLoaderMod scans `LogicMods`

`LoadModConfigs()` in `assets/Mods/BPModLoaderMod/Scripts/main.lua` looks at `Content/Paks/LogicMods`
to a fixed depth:

| Location                               | `.pak` registered | `config.lua` read |
| -------------------------------------- | ----------------- | ----------------- |
| `LogicMods/foo.pak`                    | Yes               | No                |
| `LogicMods/<subfolder>/foo.pak`        | Yes               | Yes               |
| `LogicMods/<subfolder>/<deeper>/foo.pak` | No              | No                |

A pak with no `config.lua` gets the default config: asset path `/Game/Mods/<pak name>/ModActor`. The
scan is not recursive, so an installer that adds a folder level can stop a mod from being registered
while a recursive load order page still lists it.

The UE4-5 template installs every file from an archive's `LogicMods` folder flat at
`Content/Paks/LogicMods`, so its paks are always registered and always get the default config: a
`config.lua` from a subfolder lands at the top of `LogicMods` too, where it is not read. See
[templates/TEMPLATE_UE4_5.md](templates/TEMPLATE_UE4_5.md).

A pak with `ModActor.uasset` in its index is a Blueprint mod. Its name may still not match its
`Mods/<folder>`, which BPModLoaderMod requires, so some of these mods also have to be renamed.

---

## Key source locations (RE-UE4SS repo)

| File                                      | Role                                                   |
| ----------------------------------------- | ------------------------------------------------------ |
| `assets/Mods/mods.txt`                    | Runtime config shipped with releases                   |
| `assets/Mods/mods.json`                   | Build-time source of truth                             |
| `assets/Mods/BPModLoaderMod/Scripts/main.lua` | `LogicMods` scan, `load_order.txt` reader          |
| `UE4SS/src/UE4SSProgram.cpp`              | `start_mods()`, `start_lua_mods()`, `start_cpp_mods()` |
| `tools/buildscripts/release.py`           | `modify_mods_txt()` + `modify_mods_json()`             |

---

## See also

`FILE_PARSING.md` (parsing `mods.txt`/`mods.json` — INI vs JSON handling). `FILE_SEARCH.md`
(locating the UE4SS mods folder on disk). `LOAD_ORDER_REGISTRATION.md` (the UE4SS load-order page
that reorders entries in `mods.txt`). `COLLECTIONS_FEATURE.md` (exporting/importing UE4SS mod
order as collection data). `UE4_5_REACT_ARCHITECTURE.md` (how the extension rewrites the band
between the `BPModLoaderMod` and `Keybinds` markers, and why the native mod list must match the
folders shipped here). `templates/TEMPLATE_UE4_5.md` (the `ue4ssLoadOrder` and
`logicModsLoadOrder` toggles, which decide whether these files get written at all).
