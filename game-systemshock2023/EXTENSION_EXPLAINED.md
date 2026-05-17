# System Shock (2023) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | System Shock Vortex Extension |
| Engine / Structure | UE4 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `systemshock2023` |
| Executable | `SystemShock.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/923](https://www.nexusmods.com/site/mods/923) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/System_Shock_%282023%29](https://www.pcgamingwiki.com/wiki/System_Shock_%282023%29) |

## Supported Stores

- **Steam** — `482400`
- **Epic Games Store** — `1d703aedb468494681ed9e5b657dca00`
- **GOG** — `1439637285`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries (Engine Injector) | `systemshock2023-binaries` | high | `{gamePath}/SystemShock/Binaries/Win64` |
| Config (LocalAppData) | `systemshock2023-config` | high | `{localAppData}/SystemShock/Saved/Config/WindowsNoEditor` |
| Saves (LocalAppData) | `systemshock2023-save` | high | `{localAppData}/SystemShock/Saved/SaveGames` |
| Paks | `systemshock2023-pak` | high | `{gamePath}/SystemShock/Content/Paks/~mods` |
| Root Game Folder | `systemshock2023-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `systemshock2023-config` | 35 |
| `systemshock2023-save` | 40 |
| `systemshock2023-root` | 45 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `SystemShock/Saved/Config/WindowsNoEditor` |
| Save | `SystemShock/Saved/SaveGames` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

