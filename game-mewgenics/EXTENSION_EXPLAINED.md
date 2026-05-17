# Mewgenics — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mewgenics Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mewgenics` |
| Executable | `Mewgenics.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Mewgenics.exe` |
| Executable (Demo) | `Mewgenics.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1691](https://www.nexusmods.com/site/mods/1691) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Mewgenics](https://www.pcgamingwiki.com/wiki/Mewgenics) |

## Supported Stores

- **Steam** — `686060`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `enableLoadOrder` | `true` | true if you want to use load order sorting |
| `hasLoader` | `false` | Disabled since it is not actually necessary. Installer and modType still works. |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `rootInstaller` | `false` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `true` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `mewgenics-mod` | high | `{gamePath}/mods` |
| Mewjector Mod | `mewgenics-mewjectormod` | high | `{gamePath}/mods` |
| Root Folder | `mewgenics-root` | high | `{gamePath}` |
| Mewjector | `mewgenics-mewjector` | low | `{gamePath}/.` |
| MewgenicsSaveEditor | `mewgenics-saveeeditor` | low | `{gamePath}` |
| Mewtator | `mewgenics-mewtator` | 70 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `mewgenics-mewtator` | 25 |
| `mewgenics-saveeeditor` | 26 |
| `mewgenics-mewjector` | 27 |
| `mewgenics-mod` | 28 |
| `mewgenics-mewjectormod` | 33 |
| `mewgenics-fallback` | 49 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open modlist.txt (Load Order)
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mewtator | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

