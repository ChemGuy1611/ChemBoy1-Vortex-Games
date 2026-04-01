# Cairn — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Cairn Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |
| Version | 0.1.2 |
| Date | 2026-03-30 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `cairn` |
| Executable | `Cairn.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Cairn.exe` |

## Supported Stores

- **Steam** — `1588550`
- **Epic Games Store** — `b94ba8f135914605ad8bbc9083db427e`
- **GOG** — `1300489906`

## Feature Flags

| Flag | Value | Description |
|---|---|---|
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (typically for Xbox/EGS) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `preventPluginInstall` | `false` | set to true if you want to prevent plugins not for the current mod loader from installing. Disable if using cross-compatibility plugins. |
| `loaderSwitchRestart` | `false` | set to true if you need to restart the extension after switching mod loaders |
| `enableSaveInstaller` | `false` | set to true if you want to enable the save installer (only recommended if saves are stored in the game's folder) |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `allowMelonNexus` | `false` | set false until bugs are fixed |
| `bepinexInstalled` | `false` |  |
| `melonInstalled` | `false` |  |
| `customInstalled` | `false` |  |
| `isBepinex` | `false` |  |
| `isBepinexPatcher` | `false` |  |
| `isMelon` | `false` |  |
| `isMelonPlugin` | `false` |  |
| `isCustom` | `false` |  |
| `unknown` | `false` |  |
| `fileTest` | `false` |  |
| `fileTest` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| BepInEx Mod | `cairn-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `cairn-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `cairn-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `cairn-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `cairn-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `cairn-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `cairn-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `cairn-melonloader-config` | high | `{gamePath}/UserData` |
| BepInExConfigManager | `cairn-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `cairn-melonprefman` | high | `{gamePath}/Mods` |
| Root Game Folder | `cairn-root` | high | `{gamePath}` |
| BepInEx Injector | `cairn-bepinex` | low | `{gamePath}` |
| MelonLoader | `cairn-melonloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `cairn-customloader` | 25 |
| `cairn-bepinex` | 26 |
| `cairn-melonloader` | 27 |
| `cairn-root` | 28 |
| `cairn-bepcfgman` | 29 |
| `cairn-melonprefman` | 30 |
| `cairn-assemblydll` | 31 |
| `cairn-plugin` | 33 |
| `cairn-assets` | 37 |
| `cairn-custommod` | 39 |
| `SAVE_ID` | 47 |
| `cairn-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- Download BepInExConfigManager
- Open MelonLoader Config
- Open MelonLoader Log
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
|---|---|---|
| BepInEx | 5.4.23.5 | il2cpp |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
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
