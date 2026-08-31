# Resonance: A Plague Tale Legacy — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Resonance: A Plague Tale Legacy Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `resonanceaplaguetalelegacy` |
| Executable | `Resonance.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Resonance.exe` |
| Executable (Demo) | `Resonance.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/2239](https://www.nexusmods.com/site/mods/2239) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Resonance%3A_A_Plague_Tale_Legacy](https://www.pcgamingwiki.com/wiki/Resonance%3A_A_Plague_Tale_Legacy) |

## Supported Stores

- **Steam** — `2713000`
- **Epic Games Store** — `919fba3ded0c42a388c6fc38bffd73d0`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.APlagueTaleFelons`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasLoader` | `true` | true if game needs a mod loader |
| `hasXbox` | `true` | toggle for Xbox version logic |
| `multiExe` | `false` | set to true if there are multiple executable names |
| `multiModPath` | `false` | set to true if there are multiple possible mod paths (i.e. different path for Xbox version) |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `saveInstaller` | `false` | enable save installer. Set false if path is outside of game folder |
| `fallbackInstaller` | `false` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `binariesInstaller` | `false` | enables the Binaries folder installer (for engine injectors) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `resonanceaplaguetalelegacy-root` | high | `{gamePath}` |
| Script Mod | `resonanceaplaguetalelegacy-mod` | high | `{gamePath}/Mods` |
| Mod Merger | `resonanceaplaguetalelegacy-merger` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `resonanceaplaguetalelegacy-merger` | 25 |
| `resonanceaplaguetalelegacy-root` | 27 |
| `resonanceaplaguetalelegacy-mod` | 29 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Resonance.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mod Merger | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `n/a/Resonance A Plague Tale Legacy//` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
