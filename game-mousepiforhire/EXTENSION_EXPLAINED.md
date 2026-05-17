# MOUSE: P.I. For Hire — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | MOUSE: P.I. For Hire Vortex Extension |
| Engine / Structure | Unity BepinEx/MelonLoader/Custom Loader Hybrid |
| Author | ChemBoy1 |

### Notes

- Need custom BepInEx patch due to stripped methods
- Cannot install BepInExConfigManager - causes BepInEx crash

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mousepiforhire` |
| Executable | `MOUSE.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `MOUSE.exe` |
| Executable (Demo) | `MOUSE.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1835](https://www.nexusmods.com/site/mods/1835) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Mouse%3A_P.I._For_Hire](https://www.pcgamingwiki.com/wiki/Mouse%3A_P.I._For_Hire) |

## Supported Stores

- **Steam** — `2416450`

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
| `debug` | `false` | toggle for debug mode |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `loaderChoice` | `false` | true if loader choice is enabled |
| `bepinexLoaderPatch` | `true` | should BepInEx Loader Patch be downloaded? |
| `allowBepCfgMan` | `false` | ! Causes BepInEx to crash if installed! |
| `allowMelPrefMan` | `false` | should MelonPreferencesManager be downloaded (via notification)? |
| `allowBepinexNexus` | `true` | allow Nexus Mods download of BepInEx/MelonLoader |
| `allowMelonNexus` | `true` | allows MelonLoader to be downloaded from Nexus Mods |
| `useMelonNightly` | `false` | use Nightly build of MelonLoader? |
| `customInstalled` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| BepInEx Mod | `mousepiforhire-bepinexmod` | high | `{gamePath}/BepInEx` |
| MelonLoader Mod | `mousepiforhire-melonmod` | high | `{gamePath}/.` |
| BepInEx Plugins | `mousepiforhire-bepinex-plugins` | high | `{gamePath}/BepInEx/plugins` |
| BepInEx Patchers | `mousepiforhire-bepinex-patchers` | high | `{gamePath}/BepInEx/patchers` |
| BepInEx Config | `mousepiforhire-bepinex-config` | high | `{gamePath}/BepInEx/config` |
| MelonLoader Mods | `mousepiforhire-melonloader-mods` | high | `{gamePath}/Mods` |
| MelonLoader Plugins | `mousepiforhire-melonloader-plugins` | high | `{gamePath}/Plugins` |
| MelonLoader Config | `mousepiforhire-melonloader-config` | high | `{gamePath}/UserData` |
| MelonLoader UserLibs | `mousepiforhire-melonloader-userlibs` | high | `{gamePath}/UserLibs` |
| BepInExConfigManager | `mousepiforhire-bepcfgman` | high | `{gamePath}/BepInEx` |
| MelonPreferencesManager | `mousepiforhire-melonprefman` | high | `{gamePath}/Mods` |
| Root Game Folder | `mousepiforhire-root` | high | `{gamePath}` |
| BepInEx Injector | `mousepiforhire-bepinex` | low | `{gamePath}` |
| BepInEx Loader Patch | `mousepiforhire-bepinex-loaderpatch` | low | `{gamePath}/.` |
| MelonLoader | `mousepiforhire-melonloader` | low | `{gamePath}` |
| Assembly DLL Mod | `mousepiforhire-assemblydll` | 60 | `?` |
| Assets/Resources File | `mousepiforhire-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `mousepiforhire-bepinex` | 26 |
| `mousepiforhire-bepinex-loaderpatch` | 27 |
| `mousepiforhire-melonloader` | 28 |
| `mousepiforhire-root` | 29 |
| `mousepiforhire-bepcfgman` | 30 |
| `mousepiforhire-melonprefman` | 31 |
| `mousepiforhire-assemblydll` | 32 |
| `mousepiforhire-plugin` | 33 |
| `mousepiforhire-assets` | 37 |
| `mousepiforhire-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`MOUSE.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Data Folder
- Open Save Folder
- Open BepInEx Config
- Open BepInEx Log
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.4 | mono |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Fumi Games\\MOUSE` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

