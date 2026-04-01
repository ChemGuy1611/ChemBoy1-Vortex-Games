# God of War: Ragnarok — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | God of War: Ragnarok Vortex Extension |
| Engine / Structure | Sony Port, Custom Game Data |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `godofwarragnarok` |
| Executable | `GoWR.exe` |

## Supported Stores

- **Steam** — `2322010`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| exec folder | `godofwarragnarok-data` | high | `{gamePath}` |
| patch Folder | `godofwarragnarok-patchfolder` | high | `{gamePath}/exec` |
| exec subfolder | `godofwarragnarok-execsub` | high | `{gamePath}/exec` |
| Texpack/Lodpack | `godofwarragnarok-pack` | high | `{gamePath}/exec/patch/pc_le` |
| LUAMOD_NAME | `LUAMOD_ID` | high | `{gamePath}/LUAMOD_PATH` |
| Save (Documents) | `godofwarragnarok-save` | high | `SAVE_PATH` |
| LOADER_NAME | `LOADER_ID` | low | `{gamePath}` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

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
