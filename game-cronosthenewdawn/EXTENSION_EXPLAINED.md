# Cronos: The New Dawn — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Cronos: The New Dawn Vortex Extension |
| Engine / Structure | UE5 (static exe) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `cronosthenewdawn` |
| Executable | `Cronos.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1421](https://www.nexusmods.com/site/mods/1421) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Cronos%3A_The_New_Dawn](https://www.pcgamingwiki.com/wiki/Cronos%3A_The_New_Dawn) |

## Supported Stores

- **Steam** — `2101960`
- **Epic Games Store** — `641abaddc74f4adfa3aa20dc9cadaf88`
- **GOG** — `1546068368`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |
| `CHECK_DATA` | `false` | boolean to check if game, staging folder, and config and save folders are on the same drive |
| `CHECK_DOCS` | `false` | secondary same as above (if save and config are in different locations) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `cronosthenewdawn-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `cronosthenewdawn-logicmods` | high | `{gamePath}/Cronos/Content/Paks/LogicMods` |
| UE4SS | `cronosthenewdawn-ue4ss` | high | `{gamePath}/Cronos/Binaries/Win64` |
| UE4SS Script Mod | `cronosthenewdawn-scripts` | high | `{gamePath}/Cronos/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `cronosthenewdawn-ue4ssdll` | high | `{gamePath}/Cronos/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `cronosthenewdawn-pak` | low | `{gamePath}/Cronos/Content/Paks` |
| Root Game Folder | `cronosthenewdawn-root` | high | `{gamePath}` |
| Content Folder | `cronosthenewdawn-contentfolder` | high | `{gamePath}/Cronos` |
| Binaries (Engine Injector) | `cronosthenewdawn-binaries` | high | `{gamePath}/Cronos/Binaries/Win64` |
| UE Sortable Pak Mod | `cronosthenewdawn-uesortablepak` | 25 | `?` |
| Sig Bypass | `cronosthenewdawn-sigbypass` | 60 | `?` |
| Config | `cronosthenewdawn-config` | 45 | `?` |
| Saves | `cronosthenewdawn-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `cronosthenewdawn-ue4sscombo` | 25 |
| `cronosthenewdawn-logicmods` | 27 |
| `cronosthenewdawn-ue4ss` | 31 |
| `cronosthenewdawn-sigbypass` | 32 |
| `cronosthenewdawn-scripts` | 33 |
| `cronosthenewdawn-ue4ssdll` | 35 |
| `cronosthenewdawn-root` | 37 |
| `cronosthenewdawn-contentfolder` | 38 |
| `cronosthenewdawn-config` | 39 |
| `cronosthenewdawn-save` | 41 |
| `cronosthenewdawn-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Cronos.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

