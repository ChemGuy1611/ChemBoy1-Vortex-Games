# Starsand Island — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Starsand Island Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader Hybrid |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `starsandisland` |
| Executable | `StarsandIsland.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `StarsandIsland.exe` |

## Supported Stores

- **Steam** — `2966320`
- **Xbox / Microsoft Store** — `Seasun.StarsandIsland`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `true` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executables (typically for Xbox/EGS) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `preventPluginInstall` | `true` | set to true if you want to prevent plugins not for the current mod loader from installing. Disable if using cross-compatibility plugins. |
| `loaderSwitchRestart` | `false` | set to true if you need to restart the extension after switching mod loaders |
| `enableSaveInstaller` | `false` | set to true if you want to enable the save installer (only recommended if saves are stored in the game's folder) |
| `hasCustomMods` | `false` | set to true if there are modTypes with folder paths dependent on which mod loader is installed |
| `hasCustomLoader` | `false` | set to true if there is a custom mod loader |
| `customLoaderInstaller` | `false` | set true if the custom loader uses an installer |
| `allowBepCfgMan` | `false` | should BepInExConfigManager be downloaded? |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded? False until figure out UniverseLib dependency |
| `allowBepinexNexus` | `true` | set false until bugs are fixed |
| `allowMelonNexus` | `true` | set false until bugs are fixed |
| `customInstalled` | `false` |  |
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
| BEPCFGMAN_NAME | `BEPCFGMAN_ID` | high | `{gamePath}/BEPCFGMAN_PATH` |
| MELONPREFMAN_NAME | `MELONPREFMAN_ID` | high | `{gamePath}/MELONPREFMAN_PATH` |
| ROOT_NAME | `ROOT_ID` | high | `{gamePath}` |
| BEPINEX_NAME | `BEPINEX_ID` | low | `{gamePath}` |
| MELON_NAME | `MELON_ID` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `starsandisland-customloader` | 25 |
| `BEPINEX_ID` | 26 |
| `MELON_ID` | 27 |
| `ROOT_ID` | 28 |
| `BEPCFGMAN_ID` | 29 |
| `MELONPREFMAN_ID` | 30 |
| `ASSEMBLY_ID` | 31 |
| `starsandisland-plugin` | 33 |
| `ASSETS_ID` | 37 |
| `CUSTOM_ID` | 39 |
| `SAVE_ID` | 47 |
| `starsandisland-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`StarsandIsland.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)
- **${CUSTOMLOADER_NAME} Installer**

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
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
