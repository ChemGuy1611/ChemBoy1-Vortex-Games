# Mortal Kombat 1 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mortal Kombat 1 Vortex Extension |
| Engine / Structure | UE5 (Sig Bypass) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mortalkombat` |
| Executable | `MK12.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1066](https://www.nexusmods.com/site/mods/1066) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Mortal_Kombat_1](https://www.pcgamingwiki.com/wiki/Mortal_Kombat_1) |

## Supported Stores

- **Steam** — `1971870`
- **Epic Games Store** — `863510a2790144cabba5252fba4fd808`
- **Xbox / Microsoft Store** — `WarnerBros.Interactive.K1Codename`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `IO_STORE` | `true` | true if the Paks folder contains .ucas and .utoc files |
| `hasXbox` | `true` | enables Xbox Game Pass version detection and launcher logic |
| `SYM_LINKS` | `true` | true if symlink deployment is enabled for this game |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| UE4SS LogicMods (Blueprint) | `mortalkombat-logicmods` | high | `{gamePath}/MK12/Content/Paks/LogicMods` |
| UE4SS Script-LogicMod Combo | `mortalkombat-ue4sscombo` | high | `{gamePath}` |
| Config (LocalAppData) | `mortalkombat-config` | high | `{localAppData}/MK12/Saved/Config/Windows` |
| Saves (Game Directory) | `mortalkombat-save` | high | `{localAppData}/MK12/Saved/SaveGames` |
| Root Game Folder | `mortalkombat-root` | high | `{gamePath}` |
| UE5 Paks | `mortalkombat-ue5` | high | `{gamePath}/MK12/Content/Paks/~mods` |
| UE5 Paks (no "~mods") | `mortalkombat-pakalt` | high | `{gamePath}/MK12/Content/Paks` |
| Binaries (Engine Injector) | `mortalkombat-binaries` | high | `{gamePath}/MK12/Binaries/Win64` |
| UE4SS | `mortalkombat-ue4ss` | low | `{gamePath}/MK12/Binaries/Win64` |
| UE4SS Scripts | `mortalkombat-scripts` | high | `{gamePath}/MK12/Binaries/Win64/ue4ss/Mods` |
| Signature Bypass | `mortalkombat-sigbypass` | low | `{gamePath}/MK12/Binaries/Win64` |
| UE Sortable Mod | `mortalkombat-ue5-sortable-modtype` | 25 | `?` |
| Legacy UE - REINSTALL TO SORT | `ue5-sortable-modtype` | 65 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 35 |
| `mortalkombat-ue4ss-logicscriptcombo` | 25 |
| `mortalkombat-ue4ss-logicmod` | 30 |
| `mortalkombat-ue4ss` | 40 |
| `mortalkombat-sigbypass` | 45 |
| `mortalkombat-ue4ss-scripts` | 50 |
| `mortalkombat-root` | 55 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`MK12.exe`)
- **Launch Modded Game** (`gamelaunchhelper.exe`)
- **Sig Bypass Patch** (`patch_proj.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `MK12/Saved/Config/Windows` |
| Save | `MK12/Saved/SaveGames` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

