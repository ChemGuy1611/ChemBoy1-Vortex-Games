# Like a Dragon: Pirate Yakuza in Hawaii — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Like a Dragon: Pirate Yakuza in Hawaii Vortex Extension |
| Engine / Structure | SRMM Game |
| Author | ChemBoy1 |
| Version | 0.2.0 |
| Date | 2026-02-04 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `likeadragonpirateyakuzainhawaii` |
| Executable | `runtime/media/startup.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `3061810`
- **Xbox / Microsoft Store** — `SEGAofAmericaInc.s1b05f489rw`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `likeadragonpirateyakuzainhawaii-root` | high | `{gamePath}/runtime/media` |
| Mod | `likeadragonpirateyakuzainhawaii-mod` | high | `{gamePath}/runtime/media/mods` |
| .par Data File | `likeadragonpirateyakuzainhawaii-data` | high | `{gamePath}/runtime/media/data` |
| Shin Ryu Mod Manager | `likeadragonpirateyakuzainhawaii-modmanager` | low | `{gamePath}/runtime/media` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `likeadragonpirateyakuzainhawaii-modmanager` | 25 |
| `likeadragonpirateyakuzainhawaii-data` | 29 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
