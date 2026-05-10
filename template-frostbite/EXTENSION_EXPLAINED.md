# XXX — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | XXX Vortex Extension |
| Engine / Structure | Frostbite Engine - Frosty Mod Manager |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `XXX` |
| Executable | `XXX` |
| Extension Page | XXX |
| PCGamingWiki | XXX |

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasArchives` | `false` | toggle for .archive file support |
| `allowSymlinks` | `false` | Frosty handles its own deployment; symlinks not typical |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `setupNotification` | `false` | enable to show the user a notification with special instructions (specify below) |
| `hasUserIdFolder` | `false` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `XXX-root` | high | `{gamePath}` |
| Frosty .fbmod/.archive | `XXX-frostymod` | high | `{gamePath}/FrostyModManager/Mods/XXX` |
| Plugin (FMM) | `XXX-plugin` | high | `{gamePath}/FrostyModManager/Plugins` |
| Frosty Mod Manager | `XXX-frostymodmanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `XXX-frostymodmanager` | 25 |
| `XXX-frostymod` | 30 |
| `XXX-plugin` | 35 |
| `XXX-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${PATCH_NAME}
- Delete ModData Folder
- Set ${PATCH_NAME} Enabled
- Open Config Folder
- Open Frosty Mods Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `XXX/XXX` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Symlinks Disabled** — hardlink or copy deployment is used instead of symlinks.
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
