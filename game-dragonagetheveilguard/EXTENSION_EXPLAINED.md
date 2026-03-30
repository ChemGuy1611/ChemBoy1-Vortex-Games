# Dragon Age: The Veilguard — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Dragon Age: The Veilguard Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Frosty) |
| Author | ChemBoy1 |
| Version | 0.3.0 |
| Date | 2026-02-26 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `dragonagetheveilguard` |
| Executable | `Dragon Age The Veilguard.exe` |

## Supported Stores

- **Steam** — `1845910`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `dragonagetheveilguard-root` | high | `{gamePath}` |
| DAVExtender | `dragonagetheveilguard-davex` | low | `{gamePath}/.` |
| SDK Patch (EA/Epic) | `dragonagetheveilguard-sdkpatch` | low | `{gamePath}/FrostyModManager/Profiles` |
| Frosty .fbmod/.archive | `dragonagetheveilguard-frostymod` | high | `{gamePath}/FrostyModManager/Mods/Dragon Age The Veilguard` |
| Frosty Mod Manager | `dragonagetheveilguard-frostymanager` | low | `{gamePath}/FrostyModManager` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `dragonagetheveilguard-frostymanager` | 25 |
| `dragonagetheveilguard-davex` | 27 |
| `dragonagetheveilguard-sdkpatch` | 29 |
| `dragonagetheveilguard-frostymod` | 33 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**
- **Direct Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download DAVExtender
- Delete ModData Folder
- Open Config Folder
- Open Frosty Mods Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
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
