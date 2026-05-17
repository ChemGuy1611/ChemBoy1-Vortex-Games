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
| Extension Page | [https://www.nexusmods.com/site/mods/1701](https://www.nexusmods.com/site/mods/1701) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Starsand_Island](https://www.pcgamingwiki.com/wiki/Starsand_Island) |

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

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `starsandisland-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `starsandisland-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `starsandisland-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `starsandisland-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `starsandisland-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `starsandisland-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `starsandisland-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `starsandisland-melonloader-config` | high | `{gamePath}/UserData` |
| BepInExConfigManager | `starsandisland-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `starsandisland-melonprefman` | high | `{gamePath}/Mods` |
| Root Game Folder | `starsandisland-root` | high | `{gamePath}` |
| BepInEx Injector | `starsandisland-bepinex-new` | low | `{gamePath}` |
| MelonLoader | `starsandisland-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `starsandisland-assemblydll` | 60 | `?` |
| Assets/Resources File | `starsandisland-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `starsandisland-bepinex-new` | 26 |
| `starsandisland-melonloader` | 27 |
| `starsandisland-root` | 28 |
| `starsandisland-bepcfgman` | 29 |
| `starsandisland-melonprefman` | 30 |
| `starsandisland-assemblydll` | 31 |
| `starsandisland-plugin` | 33 |
| `starsandisland-assets` | 37 |
| `starsandisland-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`StarsandIsland.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)
- **${CUSTOMLOADER_NAME} Installer** (`path.join(CUSTOMLOADER_FOLDER`)

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

