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

## Supported Stores

- **Steam** — `2379780`
- **Xbox / Microsoft Store** — `PlayStack.Balatro`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `balatro-mod` | high | `MOD_PATH` |
| ROOT_NAME | `ROOT_ID` | high | `{gamePath}` |
| LOVELY_NAME | `LOVELY_ID` | low | `{gamePath}` |
| SteamModded | `balatro-steammodded` | low | `STEAMMODDED_PATH` |
| MALVERK_NAME | `MALVERK_ID` | low | `MALVERK_PATH` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `LOVELY_ID` | 25 |
| `balatro-steammodded` | 27 |
| `MALVERK_ID` | 29 |
| `balatro-mod` | 29 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config File
- Download Lovely-Injector Latest
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
