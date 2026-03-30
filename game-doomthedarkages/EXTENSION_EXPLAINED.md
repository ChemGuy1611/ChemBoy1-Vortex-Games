# DOOM: The Dark Ages — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | DOOM: The Dark Ages Vortex Extension |
| Engine / Structure | 3rd-Party Mod Loader |
| Author | ChemBoy1 |
| Version | 0.3.0 |
| Date | 2026-03-11 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `doomthedarkages` |
| Executable | `DOOMTheDarkAges.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `3017860`
- **Xbox / Microsoft Store** — `BethesdaSoftworks.ProjectTitan`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Injector Mod | `doomthedarkages-mods` | high | `{gamePath}/mods` |
| Config | `doomthedarkages-config` | high | `{gamePath}/base` |
| Binaries / Root Folder | `doomthedarkages-binaries` | high | `{gamePath}` |
| Sound | `doomthedarkages-sound` | high | `{gamePath}/base/sound/soundbanks/pc` |
| Atlan Mod Loader | `doomthedarkages-modmanager` | low | `{gamePath}` |
| DarkAgesPatcher | `doomthedarkages-patcher` | low | `{gamePath}` |
| Atlan Resource Extractor | `doomthedarkages-atlanextractor` | low | `{gamePath}` |
| Valen | `doomthedarkages-valen` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `doomthedarkages-modmanager` | 25 |
| `doomthedarkages-atlanextractor` | 27 |
| `doomthedarkages-valen` | 28 |
| `doomthedarkages-patcher` | 29 |
| `doomthedarkages-sound` | 31 |
| `doomthedarkages-config` | 33 |
| `doomthedarkages-zipmod` | 37 |
| `doomthedarkages-binaries` | 39 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open autoexec.cfg File
- Open Sounds Folder
- Open Config Folder (User Profile)
- Open Saves Folder

## Config & Save Paths

| Type | Path |
|---|---|
| Config | `base` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
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
