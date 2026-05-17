# Mandragora: Whispers of the Witch Tree — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mandragora: Whispers of the Witch Tree Vortex Extension |
| Engine / Structure | UE + Sigbypass |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mandragorawhispersofthewitchtree` |
| Executable | `man.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1284](https://www.nexusmods.com/site/mods/1284) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Mandragora%3A_Whispers_of_the_Witch_Tree](https://www.pcgamingwiki.com/wiki/Mandragora%3A_Whispers_of_the_Witch_Tree) |

## Supported Stores

- **Steam** — `1721060`
- **Epic Games Store** — `ed2feac9c1de4248a6d297959d1da411`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |
| `IO_STORE` | `false` | true if the Paks folder contains .ucas and .utoc files |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS Script-LogicMod Combo | `mandragorawhispersofthewitchtree-ue4sscombo` | high | `{gamePath}` |
| UE4SS LogicMods (Blueprint) | `mandragorawhispersofthewitchtree-logicmods` | high | `{gamePath}/man/Content/Paks/LogicMods` |
| UE4SS | `mandragorawhispersofthewitchtree-ue4ss` | high | `{gamePath}/man/Binaries/Win64` |
| UE4SS Script Mod | `mandragorawhispersofthewitchtree-scripts` | high | `{gamePath}/man/Binaries/Win64/ue4ss/Mods` |
| UE4SS DLL Mod | `mandragorawhispersofthewitchtree-ue4ssdll` | high | `{gamePath}/man/Binaries/Win64/ue4ss/Mods` |
| Paks (no ~mods) | `mandragorawhispersofthewitchtree-pak` | low | `{gamePath}/man/Content/Paks` |
| Root Game Folder | `mandragorawhispersofthewitchtree-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `mandragorawhispersofthewitchtree-binaries` | high | `{gamePath}/man/Binaries/Win64` |
| Signature Bypass | `mandragorawhispersofthewitchtree-sigbypass` | high | `{gamePath}/man/Binaries/Win64` |
| UE Sortable Pak Mod | `mandragorawhispersofthewitchtree-uesortablepak` | 25 | `?` |
| Config (Documents) | `mandragorawhispersofthewitchtree-config` | 45 | `?` |
| Saves (Documents) | `mandragorawhispersofthewitchtree-save` | 47 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 29 |
| `mandragorawhispersofthewitchtree-ue4sscombo` | 25 |
| `mandragorawhispersofthewitchtree-logicmods` | 27 |
| `mandragorawhispersofthewitchtree-ue4ss` | 31 |
| `mandragorawhispersofthewitchtree-sigbypass` | 32 |
| `mandragorawhispersofthewitchtree-scripts` | 33 |
| `mandragorawhispersofthewitchtree-ue4ssdll` | 35 |
| `mandragorawhispersofthewitchtree-root` | 37 |
| `mandragorawhispersofthewitchtree-config` | 39 |
| `mandragorawhispersofthewitchtree-save` | 41 |
| `mandragorawhispersofthewitchtree-binaries` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`man.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Folder
- Open Binaries Folder
- Open UE4SS Mods Folder
- Open LogicMods Folder
- Open Config Folder
- Open Saves Folder
- Download UE4SS (GitHub)
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

