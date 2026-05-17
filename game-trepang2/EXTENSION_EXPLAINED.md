# Trepang2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Trepang2 Vortex Extension |
| Engine / Structure | UE4 |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `trepang2` |
| Executable | `CPPFPS.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/981](https://www.nexusmods.com/site/mods/981) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Trepang2](https://www.pcgamingwiki.com/wiki/Trepang2) |

## Supported Stores

- **Steam** — `1164940`
- **Epic Games Store** — `8d92750c06a2475b8361ae1e759bdef2`
- **GOG** — `1599916752`
- **Xbox / Microsoft Store** — `Team17DigitalLimited.Trepang2`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries (Engine Injector) | `trepang2-binaries` | high | `{gamePath}/CPPFPS/Binaries/Win64` |
| Config (LocalAppData) | `trepang2-config` | high | `{localAppData}/CPPFPS/Saved/Config/WindowsNoEditor` |
| Saves (LocalAppData) | `trepang2-save` | high | `{localAppData}/CPPFPS/Saved/SaveGames` |
| Paks | `trepang2-pak` | low | `{gamePath}/CPPFPS/Content/Paks/~mods` |
| Root Game Folder | `trepang2-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `trepang2-config` | 35 |
| `trepang2-root` | 45 |
| `trepang2-save` | 55 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `CPPFPS/Saved/Config/WindowsNoEditor` |
| Save | `CPPFPS/Saved/SaveGames` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

