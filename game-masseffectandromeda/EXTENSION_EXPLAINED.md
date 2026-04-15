# Mass Effect: Andromeda — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mass Effect: Andromeda Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Frosty) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `masseffectandromeda` |
| Executable | `MassEffectAndromeda.exe` |

## Supported Stores

- **Steam** — `1238000`
- **Epic Games Store** — `dvorak`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `masseffectandromeda-binaries` | high | `{gamePath}` |
| Frosty .fbmod/.archive | `masseffectandromeda-frostymod` | high | `{gamePath}/FrostyModManager/Mods/MassEffectAndromeda` |
| Frosty Mod Manager | `masseffectandromeda-frostymodmanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `masseffectandromeda-frostymodmanager` | 25 |
| `masseffectandromeda-frostymod` | 30 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

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
