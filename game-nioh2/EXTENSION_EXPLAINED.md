# Nioh 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Nioh 2 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `nioh2` |
| Executable | `nioh2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1628](https://www.nexusmods.com/site/mods/1628) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Nioh_2:_The_Complete_Edition](https://www.pcgamingwiki.com/wiki/Nioh_2:_The_Complete_Edition) |

## Supported Stores

- **Steam** — `1325200`
- **Epic Games Store** — `89bf5c78df7f4b91ac7ca78679bd7db1`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `nioh2-mod` | high | `{gamePath}/Mods` |
| Root Folder | `nioh2-root` | high | `{gamePath}` |
| Mod Loader | `nioh2-loader` | low | `{gamePath}/.` |
| Config | `nioh2-config` | low | `{gamePath}/CONFIGMOD_LOCATION/KoeiTecmo/NIOH2/CONFIG_FOLDERNAME` |
| Save | `nioh2-save` | low | `{gamePath}/SAVEMOD_LOCATION/KoeiTecmo/NIOH2/Savedata/USERID_FOLDER` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `nioh2-loader` | 25 |
| `nioh2-mod` | 27 |
| `nioh2-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`nioh2.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Mod Loader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

