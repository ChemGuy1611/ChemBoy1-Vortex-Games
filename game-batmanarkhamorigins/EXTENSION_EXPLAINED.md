# Batman: Arkham Origins — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Batman: Arkham Origins Vortex Extension |
| Engine / Structure | UE 2-3 Game + TFC Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `batmanarkhamorigins` |
| Executable | `SinglePlayer/Binaries/Win32/BatmanOrigins.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1989](https://www.nexusmods.com/site/mods/1989) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Batman%3A_Arkham_Origins](https://www.pcgamingwiki.com/wiki/Batman%3A_Arkham_Origins) |

## Supported Stores

- **Steam** — `209000`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `has64Bit` | `false` | toggle for 64-bit version logic |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| TFC Mod | `batmanarkhamorigins-tfcmod` | high | `{gamePath}/SinglePlayer/TFCInstaller/Mods` |
| Root Folder | `batmanarkhamorigins-root` | high | `{gamePath}/SinglePlayer` |
| .upk Mod | `batmanarkhamorigins-cookedsub` | high | `{gamePath}/SinglePlayer` |
| Binaries (Engine Injector) | `batmanarkhamorigins-binaries` | high | `{gamePath}/SinglePlayer/Binaries/Win32` |
| Movies Mod | `batmanarkhamorigins-movies` | high | `{gamePath}/SinglePlayer/BMGame/Movies` |
| TFC Installer | `batmanarkhamorigins-tfcinstaller` | low | `{gamePath}/SinglePlayer` |
| UPK Explorer | `batmanarkhamorigins-tfcexplorer` | low | `{gamePath}/SinglePlayer` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `batmanarkhamorigins-tfcinstaller` | 25 |
| `batmanarkhamorigins-tfcexplorer` | 27 |
| `batmanarkhamorigins-tfcmod` | 29 |
| `batmanarkhamorigins-root` | 31 |
| `batmanarkhamorigins-cookedsub` | 33 |
| `batmanarkhamorigins-movies` | 35 |
| `batmanarkhamorigins-binaries` | 37 |
| `batmanarkhamorigins-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SinglePlayer/Binaries/Win32/BatmanOrigins.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Graphics Settings XML
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

