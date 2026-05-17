# Deus Ex: Invisible War — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Deus Ex: Invisible War Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `deusexinvisiblewar` |
| Executable | `System/dx2.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1463](https://www.nexusmods.com/site/mods/1463) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Deus_Ex%3A_Invisible_War](https://www.pcgamingwiki.com/wiki/Deus_Ex%3A_Invisible_War) |

## Supported Stores

- **Steam** — `6920`
- **GOG** — `1207659068`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Data Mod Folder | `deusexinvisiblewar-datamodfolder` | high | `{gamePath}/content/DX2` |
| Root Folder | `deusexinvisiblewar-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `deusexinvisiblewar-binaries` | high | `{gamePath}/System` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `deusexinvisiblewar-root` | 25 |
| `deusexinvisiblewar-datamodfolder` | 27 |
| `deusexinvisiblewar-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`System/dx2.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open user.ini File
- Open Save Folder
- Open moddb.com Page
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

