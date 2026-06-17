# XCOM: Enemy Unknown — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XCOM: Enemy Unknown Vortex Extension |
| Engine / Structure | UE 2-3 Game + TFC Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `xcom` |
| Executable | `Binaries/Win32/XXX.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/XCOM%3A_Enemy_Unknown](https://www.pcgamingwiki.com/wiki/XCOM%3A_Enemy_Unknown) |

## Supported Stores

- **Steam** — `200510`
- **GOG** — `1558688142`

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
| TFC Mod | `xcom-tfcmod` | high | `{gamePath}/TFCInstaller/Mods` |
| Root Folder | `xcom-root` | high | `{gamePath}` |
| Cooked Sub Folder | `xcom-cookedsub` | high | `{gamePath}/XXX/CookedPC` |
| Binaries (Engine Injector) | `xcom-binaries` | high | `{gamePath}/Binaries/Win32` |
| Movies Mod | `xcom-movies` | high | `{gamePath}/XXX/Movies` |
| TFC Installer | `xcom-tfcinstaller` | low | `{gamePath}/.` |
| UPK Explorer | `xcom-tfcexplorer` | low | `{gamePath}/.` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `xcom-tfcinstaller` | 25 |
| `xcom-tfcexplorer` | 27 |
| `xcom-tfcmod` | 29 |
| `xcom-root` | 31 |
| `xcom-cookedsub` | 33 |
| `xcom-movies` | 35 |
| `xcom-binaries` | 37 |
| `xcom-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Binaries/Win32/XXX.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
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

