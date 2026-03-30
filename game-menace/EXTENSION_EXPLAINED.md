# MENACE — Vortex Extension Explained

## Overview

```
//////////////////////////////////////////
Name: MENACE Vortex Extension
Structure: Unity BepinEx/MelonLoader Hybrid
Author: ChemBoy1
Version: 0.4.2
Date: 2026-03-22
//////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `menace` |
| Extension Version | 0.4.2 |
| Steam App ID | 2432860 |
| Epic App ID | N/A |
| GOG App ID | 1812373738 |
| Xbox App ID | HoodedHorse.MENACE |
| Executable | `${GAME_STRING}.exe` |
| Extension Page | https://www.nexusmods.com/site/mods/1686 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Menace |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|
| `allowSymlinks` | true | Symlink deployment allowed |
| `fallbackInstaller` | true | Catch-all fallback installer active |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `CUSTOMLOADER_ID` | 25 |
| `MELON_ID` | 26 |
| `BEPINEX_ID` | 27 |
| `MODKIT_ID` | 28 |
| `MODPACKLOADER_ID` | 29 |
| `MODPACKMOD_ID` | 30 |
| `ROOT_ID` | 31 |
| `BEPCFGMAN_ID` | 32 |
| `MELONPREFMAN_ID` | 33 |
| `ASSEMBLY_ID` | 34 |
| ``${GAME_ID}-plugin`` | 35 |
| `CUSTOMLEADERS_ID` | 36 |
| `ASSETS_ID` | 37 |
| `CUSTOM_ID` | 45 |
| `SAVE_ID` | 47 |
| ``${GAME_ID}-fallback`` | 49 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch
- ${CUSTOMLOADER_NAME} Installer

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Download ${MODKIT_NAME}**
- **Open Data Folder**
- **Open Save Folder**
- **Open BepInEx Config**
- **Open BepInEx Log**
- **Download BepInExConfigManager**
- **Open MelonLoader Config**
- **Open MelonLoader Log**
- **Download MelonPreferencesManager**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex symlinks/copies to game folder
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
