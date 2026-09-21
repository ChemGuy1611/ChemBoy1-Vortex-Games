# Onimusha: Way of the Sword — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Onimusha: Way of the Sword Vortex Extension |
| Engine / Structure | Fluffy + REFramework (RE Engine) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `onimushawayofthesword` |
| Executable | `OnimushaWotS.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (Demo) | `OnimushaWotS_Demo.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Onimusha%3A_Way_of_the_Sword](https://www.pcgamingwiki.com/wiki/Onimusha%3A_Way_of_the_Sword) |

## Supported Stores

- **Steam** — `2638890`
- **Epic Games Store** — `40ec84025ba440c290dd4c8dabfba36c`
- **Xbox / Microsoft Store** — `F024294D.63383C66B8708`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `useRefNightly` | `false` | toggle for using the REFramework nightly instead of Nexus release |
| `hasXbox` | `true` | toggle for Xbox version logic - default true with new Capcom deal |
| `reZip` | `true` | ! NOT WORKING YET - KEEP AS TRUE FOR NOW - set to true to re-zip Fluffy Mods (possibly not necessary for FLUFFY v3.069+) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (and multiple FLUFFY_FOLDERs) (typically for Demo) |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `onimushawayofthesword-root` | high | `{gamePath}` |
| Loose Lua/Plugin (REFramework) | `onimushawayofthesword-looselua` | high | `{gamePath}/.` |
| Fluffy Mod Manager | `onimushawayofthesword-fluffymanager` | low | `{gamePath}` |
| REFramework | `onimushawayofthesword-reframework` | low | `{gamePath}` |
| Fluffy Mod | `onimushawayofthesword-fluffymod` | 25 | `?` |
| Fluffy Preset | `onimushawayofthesword-preset` | 40 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `onimushawayofthesword-fluffymanager` | 25 |
| `onimushawayofthesword-reframework` | 27 |
| `onimushawayofthesword-looselua` | 29 |
| `onimushawayofthesword-root` | 31 |
| `onimushawayofthesword-preset` | 33 |
| `onimushawayofthesword-fluffymodzip` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`OnimushaWotS.exe`)
- **Custom Launch (Demo)** (`OnimushaWotS_Demo.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest REFramework Nightly
- Open Config File
- Open Save Folder (Steam)
- Open PCGamingWiki Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Fluffy Mod Manager | — | — |
| REFramework | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `.` |
| Save | `/userdata` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
