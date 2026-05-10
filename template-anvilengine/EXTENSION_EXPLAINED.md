# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Anvil Engine - AnvilToolkit/ForgerPatchManager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `XXX.exe` |
| Extension Page | XXX |
| PCGamingWiki | XXX |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasAtk` | `true` | true if game supports AnvilToolkit — set to false for games that don't use ATK |
| `hasForger` | `false` | true if game supports Forger Patch Manager (.forger2 files) — typically older AC games |
| `setupNotification` | `false` | enable to show the user a notification with special instructions on first setup |
| `allowSymlinks` | `false` | symlinks can cause issues when repacking with ATK — set to false when hasAtk = true |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Extracted Folder | `XXX-extracted` | high | `{gamePath}` |
| .forge Folder | `XXX-forgefolder` | high | `{gamePath}` |
| .data Folder | `XXX-datafolder` | high | `{gamePath}` |
| Loose Data Files | `XXX-loosedata` | high | `{gamePath}` |
| Forge Replacement | `XXX-forgefile` | high | `{gamePath}` |
| Binaries / Root Folder | `XXX-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-atk` | 25 |
| `XXX-extracted` | 27 |
| `XXX-forgefolder` | 29 |
| `XXX-datafolder` | 31 |
| `XXX-loosedata` | 33 |
| `XXX-forgefile` | 35 |
| `XXX-root` | 37 |
| `XXX-forger` | 41 |
| `XXX-forgerpatch` | 43 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Game Ubisoft Plus**
- **Launch Vulkan**
- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Forger Patch Manager | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
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
