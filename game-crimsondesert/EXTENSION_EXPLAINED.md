# Crimson Desert Vortex Extension — How It Works

This document explains the structure and logic of [`index.js`](index.js) — the Vortex mod manager extension for *Crimson Desert* by Pearl Abyss (~2,100 lines). It integrates the game into Vortex so users can install, manage, and deploy mods.

---

## 1. Architecture Overview

```
main(context)
 └── applyGame(context, spec)
      ├── context.registerGame()
      ├── context.registerModType() × N
      ├── context.registerInstaller() × N
      └── context.registerAction() × N
 └── context.once()
      └── did-deploy → deployNotify()
```

---

## 2. Configuration Constants (Lines 30–280)

Everything about the game is declared as named constants at the top:

| Constant | Value / Purpose |
|---|---|
| `GAME_ID` | `"crimsondesert"` — unique Vortex ID |
| `STEAMAPP_ID` | `"3321460"` — Steam auto-discovery |
| `EPICAPP_ID` | EGS app ID for auto-discovery |
| `EXEC` | Path to game executable (`bin64/CrimsonDesert.exe`) |
| `DATA_FOLDERS` | `["meta", "0000"…"0035"]` — game's numbered data folders |
| `BINARIES_EXTS` | `.dll`, `.asi` — engine injector file types |

**Feature flags** control which systems are active:

```js
const loadOrder = false;        // no drag-drop load ordering
const needsModInstaller = true; // mods go through an installer
const rootInstaller = true;     // root folder installer enabled
const fallbackInstaller = true; // catch-all installer enabled
```

---

## 3. The `spec` Object (Lines 284–363)

This declarative object defines:
- **Game metadata** — name, logo, merge mode, required files
- **Store IDs** — Steam, Epic, Xbox, GOG for game discovery
- **Mod types** — each entry maps a category of mod to a target directory

```
spec
 ├── game          → name, logo, modPath, requiredFiles, store IDs
 ├── modTypes[]    → Data Mod, Browser Mod, Patch Mod, Root, Binaries, Tools
 └── discovery     → STEAMAPP_ID, EPICAPP_ID
```

### Mod Type → Target Directory Mapping

| Mod Type | Target Directory |
|---|---|
| Data Mod | `{gamePath}` (root) |
| Browser Mod | `{gamePath}/mods` |
| Patch Mod | `{gamePath}/mods` |
| Root | `{gamePath}` |
| Binaries | `{gamePath}/bin64` |
| Tools | `{gamePath}` (low priority) |

---

## 4. Mod Types & Installers

Every mod goes through a **test → install** pair. The test function signals whether the installer handles a given archive; the install function produces copy instructions.

| Installer | Test Function | What It Detects |
|---|---|---|
| Data Mod | `testMod()` | Archives with `meta`, `0000`–`0035` folders |
| Patch Mod | `testPatchMod()` | `00XX` folders where XX > 35 (e.g., `0036`) |
| Crimson Browser Mod | `testBrowserMod()` | `manifest.json` + `files` folder pair |
| JSON Mod | `testJsonMod()` | `.json` files without a numbered folder |
| Root Mod | `testRoot()` | Folder matching `bin64` |
| Binaries | `testBinaries()` | `.dll`/`.asi` files (no `.exe`) |
| Fallback | `testFallback()` | Any mod for this game (catch-all) |

**Priority ladder** (lower number = tested first):

```
25 → Loader
27 → Root
29 → Tools
31 → Browser Mod
33 → Patch Mod
35 → JSON Mod / Data Mod
37 → Binaries
49 → Fallback
```

---

## 5. Crimson Desert's Special Mod System

This game uses a **numbered folder system** for its data archives (`.paz`/`.pamt`):
- Folders `0000`–`0035` = vanilla game data
- Mod data goes into `0036`+ folders, which the game loads *after* vanilla (no repacking needed)
- The `meta/0.papgt` file acts as an index that must be **patched on deploy** — done by external tools like Crimson Browser or JSON Mod Manager

This is why `deployNotify()` fires after every deployment — it prompts the user to run one of the external patchers.

---

## 6. Tool Integration (Lines 366–474)

The extension registers external tools visible in Vortex's Tools panel:

| Tool | Executable | Notes |
|---|---|---|
| Crimson Browser | `crimson_browser.py` | Python-based mod manager |
| JSON Mod Manager | `CD JSON Mod Manager.exe` | Primary patch manager |
| QT Mod Manager | `QT_ModManager.exe` | Alternative manager |
| Save Editor | `CrimsonSaveEditor.exe` | |
| Unpacker | `PazGui.exe` | Deprecated |

Tools can be **auto-downloaded from Nexus Mods** via downloader functions like `downloadBrowser()` and `downloadJsonManager()`.

---

## 7. Game Discovery (Lines 533–604)

- `makeFindGame()` uses `util.GameStoreHelper.findByAppId()` to locate the game across stores
- `requiresLauncher()` returns the appropriate store launcher (Steam, Epic, or Xbox) so Vortex launches the game correctly
- `getExecutable()` detects the Xbox version by checking for `gamelaunchhelper.exe`

---

## 8. Entry Point & Registration (Lines 1964–2111)

The `main(context)` function is the Vortex extension entry point, exported as:

```js
module.exports = { default: main };
```

It:
1. Calls `applyGame(context, spec)` — runs all `context.register*()` calls
2. Sets up a `context.once()` block that hooks into `did-deploy` events → `deployNotify()`

---

## 9. Registered UI Actions (Lines 1888–1961)

The extension adds toolbar buttons visible when Crimson Desert is the active game:

- **Download Crimson Browser + Setup**
- **Run Crimson Browser Setup**
- **Download JSON Mod Manager**
- **Download Save Editor**
- **Open Config File**
- **Open Save Folder**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

---

## 10. Full Mod Installation Flow

```
User drops mod archive into Vortex
  └── Vortex runs testXxx() for each installer (priority order)
       └── First supported=true wins
            └── Vortex runs installXxx(files)
                 └── Returns copy instructions + setmodtype
                      └── Vortex places files in staging folder
                           └── User clicks Deploy
                                └── Vortex symlinks/copies files to game folder
                                     └── did-deploy event fires
                                          └── Notification: "Run JSON Manager or Crimson Browser to complete install"
```

---

## 11. Fallback Installer Behavior

When no specific installer matches (`testFallback()` catches everything), `installFallback()` copies files as-is and shows a detailed notification explaining:
- What the fallback installer means
- How to handle ReShade presets
- Buttons to open staging folder, mod page, contact the extension developer, or download ReShade
