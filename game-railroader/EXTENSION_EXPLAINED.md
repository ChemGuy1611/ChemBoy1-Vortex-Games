# Railroader — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Railroader Vortex Extension |
| Engine / Structure | Unity UMM (Unity Mod Manager) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `railroader` |
| Executable | `Railroader.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `Railroader.exe` |
| PCGamingWiki | [https://railroader.fandom.com/wiki/Railroader_Wiki](https://railroader.fandom.com/wiki/Railroader_Wiki) |

## Supported Stores

- **Steam** — `1683150`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `multiExe` | `false` | set to true if there are multiple executables (and conseq. DATA_FOLDERs) (typically for Xbox/EGS) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `railroader-root` | high | `{gamePath}` |
| Assembly DLL Mod | `railroader-assemblydll` | 60 | `?` |
| Assets/Resources File | `railroader-assets` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `railroader-root` | 8 |
| `railroader-assemblydll` | 25 |
| `railroader-assets` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Railroader.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Data Folder
- Open Save Folder
- Open Wiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report
- Open PCGamingWiki Page

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Unity Mod Manager (UMM) | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config (Registry) | `HKEY_CURRENT_USER\\Software\\Giraffe Lab LLC\\Railroader` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `modtype-umm`.

