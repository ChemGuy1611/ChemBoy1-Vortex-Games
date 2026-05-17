# Lies of P — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Lies of P Vortex Extension |
| Engine / Structure | UE4 (XBOX Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `liesofp` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/852](https://www.nexusmods.com/site/mods/852) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Lies_of_P](https://www.pcgamingwiki.com/wiki/Lies_of_P) |

## Supported Stores

- **Steam** — `1627720`
- **Xbox / Microsoft Store** — `Neowiz.3616725F496B`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Paks | `liesofp-pak` | low | `{gamePath}/LiesofP/Content/Paks/~mods` |
| Root Game Folder | `liesofp-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `liesofp-binaries` | 40 | `?` |
| Config (LocalAppData) | `liesofp-config` | 45 | `?` |
| Save | `liesofp-save` | 50 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `liesofp-config` | 27 |
| `liesofp-save` | 29 |
| `liesofp-root` | 31 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Paks Mods Folder
- Open Binaries Folder
- Open Config Folder
- Open Saves Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| UE4SS | — | — |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `LiesofP/Saved/Config/WindowsNoEditor` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

