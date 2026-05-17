# Dishonored 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dishonored 2 Vortex Extension |
| Engine / Structure | Void Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dishonored2` |
| Executable | `Dishonored2.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/925](https://www.nexusmods.com/site/mods/925) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Dishonored_2](https://www.pcgamingwiki.com/wiki/Dishonored_2) |

## Supported Stores

- **Steam** — `403640`
- **Epic Games Store** — `f5df10ade404453abaaed9c6c204e3d5`
- **GOG** — `1431426311`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.Dishonored2-PC`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `CHECK_DATA` | `false` | true if game, staging, and save folders are all on the same drive (partition check) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Void Mod | `dishonored2-voidmod` | high | `{gamePath}/Void Installer/Mods` |
| Void Installer | `dishonored2-voidinstaller` | low | `{gamePath}/.` |
| Root Game Folder | `dishonored2-root` | high | `{gamePath}` |
| Video Mod | `dishonored2-video` | high | `{gamePath}/base/video` |
| Void Explorer | `dishonored2-voidexplorer` | low | `{gamePath}/.` |
| Save Game | `dishonored2-save` | 62 | `?` |
| Config | `dishonored2-config` | 63 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dishonored2-voidinstaller` | 25 |
| `dishonored2-voidexplorer` | 27 |
| `dishonored2-voidmod` | 29 |
| `dishonored2-root` | 31 |
| `dishonored2-video` | 33 |
| `dishonored2-save` | 35 |
| `dishonored2-config` | 37 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`Dishonored2.exe`)
- **Custom Launch** (`gamelaunchhelper.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

