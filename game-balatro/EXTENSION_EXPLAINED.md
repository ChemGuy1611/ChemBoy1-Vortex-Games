# Balatro — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Balatro Vortex Extension |
| Engine / Structure | Mod Loader (Mods in AppData Folder) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `balatro` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1315](https://www.nexusmods.com/site/mods/1315) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Balatro](https://www.pcgamingwiki.com/wiki/Balatro) |

## Supported Stores

- **Steam** — `2379780`
- **Xbox / Microsoft Store** — `PlayStack.Balatro`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `balatro-mod` | high | `APPDATA/Balatro/Mods` |
| Root Folder | `balatro-root` | high | `{gamePath}` |
| Lovely-Injector | `balatro-LOVELY` | low | `{gamePath}` |
| SteamModded | `balatro-steammodded` | low | `STEAMMODDED_PATH` |
| Malverk (Texture Pack Manager) | `balatro-malverk` | low | `MALVERK_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `balatro-LOVELY` | 25 |
| `balatro-steammodded` | 27 |
| `balatro-malverk` | 29 |
| `balatro-mod` | 29 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Open Save Folder (Steam)
- Download Lovely-Injector Latest
- Download ${MALVERK_NAME} Latest
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

