# MOUSE: P.I. For Hire — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | MOUSE: P.I. For Hire Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mousepiforhire` |
| Executable | `XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `XXX.exe` |
| Executable (Demo) | `XXX.exe` |
| Extension Page | XXX |

## Supported Stores

- **Steam** — `2416450`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `true` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executables (typically for Xbox/EGS) |
| `isCustom` | `false` |  |
| `unknown` | `false` |  |
| `fileTest` | `false` |  |
| `fileTest` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BEPINEX_MOD_NAME | `BEPINEX_MOD_ID` | high | `{gamePath}/BEPINEX_MOD_PATH` |
| MELON_MOD_NAME | `MELON_MOD_ID` | high | `{gamePath}/MELON_MOD_PATH` |
| BEPINEX_PLUGINS_NAME | `BEPINEX_PLUGINS_ID` | high | `{gamePath}/BEPINEX_PLUGINS_PATH` |
| BEPINEX_PATCHERS_NAME | `BEPINEX_PATCHERS_ID` | high | `{gamePath}/BEPINEX_PATCHERS_PATH` |
| BEPINEX_CONFIG_NAME | `BEPINEX_CONFIG_ID` | high | `{gamePath}/BEPINEX_CONFIG_PATH` |
| MELON_MODS_NAME | `MELON_MODS_ID` | high | `{gamePath}/MELON_MODS_PATH` |
| MELON_PLUGINS_NAME | `MELON_PLUGINS_ID` | high | `{gamePath}/MELON_PLUGINS_PATH` |
| MELON_CONFIG_NAME | `MELON_CONFIG_ID` | high | `{gamePath}/MELON_CONFIG_PATH` |
| MELON_USERLIB_NAME | `MELON_USERLIB_ID` | high | `{gamePath}/MELON_USERLIB_PATH` |
| BEPCFGMAN_NAME | `BEPCFGMAN_ID` | high | `{gamePath}/BEPCFGMAN_PATH` |
| MELONPREFMAN_NAME | `MELONPREFMAN_ID` | high | `{gamePath}/MELONPREFMAN_PATH` |
| ROOT_NAME | `ROOT_ID` | high | `{gamePath}` |
| BEPINEX_NAME | `BEPINEX_ID` | low | `{gamePath}` |
| MELON_NAME | `MELON_ID` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- Open MelonLoader Config
- Open MelonLoader Log
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
