# STORY OF SEASONS: Grand Bazaar — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | STORY OF SEASONS: Grand Bazaar Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `storyofseasonsgrandbazaar` |
| Executable | `SOSGrandBazaar.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `SOSGrandBazaar.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1784](https://www.nexusmods.com/site/mods/1784) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Story_Of_Seasons%3A_Grand_Bazaar](https://www.pcgamingwiki.com/wiki/Story_Of_Seasons%3A_Grand_Bazaar) |

## Supported Stores

- **Steam** — `2508780`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executables (and conseq. DATA_FOLDERs) (typically for Xbox/EGS) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `allowBepinexNexus` | `false` | set false until bugs are fixed |
| `downloadCfgMan` | `true` | should BepInExConfigManager be downloaded? |
| `bleedingEdge` | `true` | set to true to download bleeding edge builds of BepInEx (IL2CPP only) |
| `hasVersionFile` | `false` | set to true if there is a Version.info file that contains the game version number |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `storyofseasonsgrandbazaar-root` | high | `{gamePath}` |
| BepInEx Configuration Manager | `storyofseasonsgrandbazaar-bepcfgman` | high | `{gamePath}/Bepinex` |
| BepInEx Mod | `storyofseasonsgrandbazaar-bepmods` | high | `{gamePath}/BepinEx/plugins` |
| Assembly DLL Mod | `storyofseasonsgrandbazaar-assemblydll` | 60 | `?` |
| Assets/Resources File | `storyofseasonsgrandbazaar-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `storyofseasonsgrandbazaar-root` | 8 |
| `storyofseasonsgrandbazaar-bepcfgman` | 9 |
| `storyofseasonsgrandbazaar-assemblydll` | 25 |
| `storyofseasonsgrandbazaar-assets` | 27 |
| `storyofseasonsgrandbazaar-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SOSGrandBazaar.exe`)
- **Custom Launch** (`SOSGrandBazaar.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download BepInExConfigManager
- Open BepInEx.cfg
- Open Data Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| BepInEx | 5.4.23.5 | il2cpp, x64 |
| BepInEx Configuration Manager | 18.4.1 | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\\\STORY OF SEASONS Grand Bazaar` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `modtype-bepinex`.

