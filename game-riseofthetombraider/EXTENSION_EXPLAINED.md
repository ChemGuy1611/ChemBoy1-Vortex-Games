# Rise of the Tomb Raider — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Rise of the Tomb Raider Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `riseofthetombraider` |
| Executable | `ROTTR.exe` |
| Executable (Xbox) | `ROTTR_UAP.exe` |

## Supported Stores

- **Steam** — `391220`
- **Epic Games Store** — `f7cc1c999ac146f39b356f53e3489514`
- **GOG** — `1926077727`
- **Xbox / Microsoft Store** — `39C668CD.RiseoftheTombRaider`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `riseofthetombraider-binaries` | high | `{gamePath}` |
| Mod Manager Mod | `riseofthetombraider-modmanagermod` | high | `{gamePath}/Mods` |
| TR Reboot Mod Manager | `riseofthetombraider-trmodmanager` | low | `{gamePath}` |
| ROTTR Mod Manager | `riseofthetombraider-manager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `riseofthetombraider-manager` | 25 |
| `riseofthetombraider-trmodmanager` | 30 |
| `riseofthetombraider-binaries` | 35 |
| `riseofthetombraider-modmanagermod` | 40 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **ROTTR Mod Manager**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
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
