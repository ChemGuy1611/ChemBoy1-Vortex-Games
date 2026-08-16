# Script Environment Bootstrap

Steps to set up the dev script environment on a new Windows PC.

---

## 1. Prerequisites

| Tool | Notes |
| --- | --- |
| **Git** | Required for all repos |
| **Python 3.11+** | Must be on `PATH` |
| **Node.js LTS** | Must be on `PATH`; required for `generate_explained.js`, `node --check`, and ESLint |
| **Vortex** | Install normally; creates its data folder at `%APPDATA%\Vortex\` |

---

## 2. Clone Repos

Everything is cloned side by side into one repos root, referred to below as `<repos>`. The drive
and folder name are up to you — scripts resolve `REPO_ROOT` from their own file location, so no
path here is baked in. This setup uses `C:\Game_Tools\0 GitHub Repos\`.

Only `ChemBoy1-Vortex-Games` is required to run the scripts — every other repo below is a reference
or side project and can be skipped. The multi-root VS Code workspace `vortex-dev.code-workspace`
sits in `<repos>` and opens the whole set together.

### Owned repos

| Folder | Upstream | Purpose |
| --- | --- | --- |
| `ChemBoy1-Vortex-Games` | `ChemGuy1611/ChemBoy1-Vortex-Games` | Primary repo — game extensions, dev scripts, `resources/` docs |
| `Personal` | `ChemGuy1611/Personal` | Standalone utility scripts; has its own `SCRIPTS.md` |
| `vortex_readyornot_extension` | `ChemGuy1611/vortex_readyornot_extension` | Ready or Not extension, maintained in its own repo |
| `vortex-unreal-engine-library` | `ChemGuy1611/vortex-unreal-engine-library` | UEMI — Unreal Engine mod integration library |
| `MSCModLoader-Vortex` | `ChemGuy1611/MSCModLoader-Vortex` | Editable fork of the My Summer Car mod loader extension |
| `fork-Vortex` | `ChemGuy1611/Vortex` | Personal fork of the Vortex app, used for upstream pull requests |
| `vortex-games` | `ChemGuy1611/vortex-games` | Fork of the bundled Nexus Mods game extensions; kept for reference |

### Vortex application and libraries

Reference clones — read for API shapes and runtime behaviour, not modified locally.

| Folder | Upstream | Purpose |
| --- | --- | --- |
| `Vortex` | `Nexus-Mods/Vortex` | Application source; the authority on extension API and runtime behaviour |
| `vortex-api` | `Nexus-Mods/vortex-api` | Published `@nexusmods/vortex-api` package — typings and generated docs |
| `Vortex-Backend` | `Nexus-Mods/Vortex-Backend` | Backend data, including `extensions-manifest-original.json` (see section 6) |
| `node-winapi-bindings` | `Nexus-Mods/node-winapi-bindings` | Native Windows calls (registry, INI) used during game discovery |
| `node-nexus-api` | `Nexus-Mods/node-nexus-api` | Nexus Mods client library (v1 REST plus v2 GraphQL) that Vortex ships |
| `fomod-installer` | `Nexus-Mods/fomod-installer` | FOMOD installer invoked by Vortex for scripted installers |
| `game-description-language` | `Nexus-Mods/game-description-language` | GDL game-definition tooling |
| `vortex-parse-ini` | `Nexus-Mods/vortex-parse-ini` | INI parser available to extensions |
| `NexusMods.App` | `Nexus-Mods/NexusMods.App` | Next-generation Nexus Mods app; context only, unrelated to these extensions |

### Extension references

Third-party and first-party extensions kept as worked examples.

| Folder | Upstream |
| --- | --- |
| `game-subnautica2` | `Nexus-Mods/game-subnautica2` |
| `game-starfield` | `Nexus-Mods/game-starfield` |
| `game-oblivionremastered` | `Nexus-Mods/game-oblivionremastered` |
| `game-residentevilvillage` | `Nexus-Mods/game-residentevilvillage` |
| `game-mount-and-blade2` | `BUTR/game-mount-and-blade2` |
| `cyberpunk2077_ext_redux` | `E1337Kat/cyberpunk2077_ext_redux` |
| `extension-re-engine-wrapper` | `Nexus-Mods/extension-re-engine-wrapper` |
| `extension-thunderstore-handler` | `Nexus-Mods/extension-thunderstore-handler` |
| `sample-extension` | `nexus-mods/sample-extension` — clone lands in `sample-extension\sample-extension\` |

### Game tooling

Mod loaders and asset tooling that extensions install or reference — not Vortex components.

| Folder | Upstream |
| --- | --- |
| `FrostyToolsuite` | `CadeEvs/FrostyToolsuite` |
| `RE-UE4SS` | `UE4SS-RE/RE-UE4SS` |

### Local folders (not repos)

These are machine-local and appear in the workspace for convenience; nothing needs to be cloned.

| Path | Contents |
| --- | --- |
| `%APPDATA%\Vortex\plugins` | Extensions currently installed in Vortex on this machine |
| `<repos>\..\00 Example Vortex Extensions` | Downloaded third-party extensions, unpacked for reference |

Vortex stores its data per-user under `%APPDATA%\Vortex\` by default. Enabling **Multi-User Mode**
in Vortex's settings moves that whole folder to `%PROGRAMDATA%\vortex\` — if that mode is on,
substitute it in the path above and anywhere else `%APPDATA%\Vortex` appears in this guide.

All paths above are the expected locations. Scripts derive `REPO_ROOT` relative to their own file, but some paths are hardcoded in env vars — match the folder layout or override with env vars (section 4).

---

## 3. Python Dependencies

Install from the repo root:

```text
pip install PySide6 Pillow
```

| Package | Required by |
| --- | --- |
| `PySide6` | `vortex_gui.py` |
| `Pillow` | `vortex_utils.py` image resize, `fetch_cover_art.py`, `fetch_exec_icon.py`, `new_extension.py`, `patch_extensions.py` |

`vortex_utils.py` itself uses stdlib only. Pillow is lazy-imported — scripts run without it but image operations are skipped with a warning.

**SVG rasterizing (`render_svg.py` only):**

```text
pip install svglib reportlab pycairo rlPyCairo
```

reportlab 5.x no longer ships its own `_renderPM` drawing backend, so `rlPyCairo` plus `pycairo` are what render the pixels — without them `renderPM` raises `RenderPMError: cannot import desired renderPM backend rlPyCairo`. The Windows `pycairo` wheel is self-contained; no GTK or system Cairo install is needed.

**Personal repo only:**

```text
pip install requests
```

Required by `steam_wishlist_prices.py`.

---

## 4. Node.js Dependencies

From `ChemBoy1-Vortex-Games\`, run command below to install dev dependencies:

```text
npm install
```

Installs dev dependencies: `eslint`, `prettier`, `prettier-eslint`, `typescript`, and `source-map`.

---

## 5. Windows Environment Variables

Set all of these under `HKEY_CURRENT_USER\Environment` (i.e. user-level, not system). The easiest way is **System Properties -> Environment Variables -> User variables**.

| Variable | Value | Required by |
| --- | --- | --- |
| `NEXUS_API_KEY` | Your Nexus Mods API key | `new_extension.py`, `fetch_nexus_stats.py`, `patch_extensions.py`, `nexus_games_report.py` |
| `STEAM_API_KEY` | Your Steam Web API key | `new_extension.py` (Steam app info lookups) |
| `STEAM_USER_ID` | Your Steam 64-bit ID | `new_extension.py` |
| `STEAMGRIDDB_API_KEY` | Your SteamGridDB API key | `fetch_cover_art.py` |
| `VORTEX_MANIFEST_PATH` | *(optional override)* `%APPDATA%\Vortex\temp\extensions-manifest.json` | `patch_extensions.py`, `nexus_games_report.py`; override only — default resolves automatically via `%APPDATA%` |

API keys are read via `os.environ.get()` first, then `HKEY_CURRENT_USER\Environment` registry fallback. Do not hardcode them.

After setting user env vars, restart any open terminals for the changes to take effect.

---

## 6. Extension Manifest

`extensions-manifest.json` is the canonical source for which Nexus mod ID corresponds to each Vortex extension. It is used by `patch_extensions.py` (extension URL patching) and `nexus_games_report.py` (supported-status column).

The file is written by Vortex at runtime to `%APPDATA%\Vortex\temp\extensions-manifest.json`. Launch Vortex at least once to generate it before running scripts that consume it.

---

## 7. Verify Setup

```text
# Check Python + key packages
python -c "import vortex_utils; print('vortex_utils OK')"
python -c "from PIL import Image; print('Pillow OK')"
python -c "from PySide6.QtWidgets import QApplication; print('PySide6 OK')"

# Check Node
node --version
npx eslint --version

# Check manifest path exists
python -c "import os; p=os.path.join(os.environ.get('APPDATA',''), 'Vortex', 'temp', 'extensions-manifest.json'); print('manifest OK' if os.path.exists(p) else 'MISSING: ' + p)"

# Check env vars
python -c "import os; [print(k, '=', 'SET' if os.environ.get(k) else 'MISSING') for k in ['NEXUS_API_KEY','STEAM_API_KEY','STEAM_USER_ID','STEAMGRIDDB_API_KEY']]"
```

---

## See also

`TEMPLATES_OVERVIEW.md` (what a working environment builds against). `REGISTER_GAME.md` (the
required extension file set this environment is set up to develop). `VORTEX_DEV_BUILD.md` (the
separate, much heavier toolchain needed to build the Vortex application itself from source).
