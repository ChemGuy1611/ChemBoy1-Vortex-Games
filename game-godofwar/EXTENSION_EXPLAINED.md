# God of War (2018) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | God of War (2018) Vortex Extension |
| Engine / Structure | Sony Port, Custom Game Data |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `godofwar` |
| Executable | `GoW.exe` |

## Supported Stores

- **Steam** — `1593500`
- **Epic Games Store** — `456afef39a4c4cbbb6b17e92201443d7`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| exec folder | `godofwar-data` | high | `{gamePath}` |
| patch Folder | `godofwar-patchfolder` | high | `{gamePath}/exec` |
| exec subfolder | `godofwar-execsub` | high | `{gamePath}/exec` |
| Texpack/Lodpack | `godofwar-pack` | high | `{gamePath}/exec/patch/pc_le` |
| Texpack/Lodpack | `godofwar-pack` | high | `{gamePath}/exec/patch/pc_le` |
| LUAMOD_NAME | `LUAMOD_ID` | high | `{gamePath}/LUAMOD_PATH` |
| Save (User Home) | `godofwar-save` | high | `SAVE_PATH` |
| LOADER_NAME | `LOADER_ID` | low | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

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
