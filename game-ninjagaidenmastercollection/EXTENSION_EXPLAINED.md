# NINJA GAIDEN: Master Collection — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | NINJA GAIDEN: Master Collection Vortex Extension |
| Engine / Structure | Multi-Game, Mod Loader |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ninjagaidenmastercollection` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1171](https://www.nexusmods.com/site/mods/1171) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Series%3ANinja_Gaiden%3A_Master_Collection](https://www.pcgamingwiki.com/wiki/Series%3ANinja_Gaiden%3A_Master_Collection) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `ninjagaidenmastercollection-root` | high | `{gamePath}` |
| Mod Loader Mod | `ninjagaidenmastercollection-mlmod` | high | `{gamePath}/mods` |
| Databin Folder | `ninjagaidenmastercollection-databinfolder` | high | `{gamePath}` |
| Databin Subfolder | `ninjagaidenmastercollection-databinsubfolder1` | high | `{gamePath}/databin` |
| Tmx_NgLoader (Mods Loader) | `ninjagaidenmastercollection-xboxmodloader` | low | `{gamePath}` |
| Essential Files for NGS1 | `ninjagaidensigma-steammodloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ninjagaidenmastercollection-xboxmodloader` | 25 |
| `ninjagaidensigma-steammodloader` | 27 |
| `ninjagaidensigma2-steammodloader` | 29 |
| `ninjagaiden3razorsedge-steammodloader` | 31 |
| `ninjagaidenmastercollection-mlmod` | 33 |
| `ninjagaidenmastercollection-databinfolder` | 35 |
| `ninjagaidenmastercollection-databinsubfolder1` | 37 |
| `ninjagaidenmastercollection-databinsubfolder23` | 40 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config/Save Folder
- View Changelog
- Open Downloads Folder
- Open Config/Save Folder
- View Changelog
- Open Downloads Folder
- Open Config/Save Folder
- View Changelog
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

