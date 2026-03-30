# Shadow of the Tomb Raider — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Shadow of the Tomb Raider Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer |
| Author | ChemBoy1 |
| Version | 0.5.0 |
| Date | 2025-10-29 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `shadowofthetombraider` |
| Executable | `SOTTR.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `750920`
- **Epic Games Store** — `890d9cf396d04922a1559333df419fed`
- **GOG** — `1356518037`
- **Xbox / Microsoft Store** — `39C668CD.TombRaider11BaseGame`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries / Root Folder | `shadowofthetombraider-binaries` | high | `{gamePath}` |
| Mod Manager Mod | `shadowofthetombraider-modmanagermod` | high | `{gamePath}/Mods` |
| Special K Texture Mod | `shadowofthetombraider-sktexture` | high | `{gamePath}/SK_Res/inject/textures` |
| SOTTR Mod Manager | `shadowofthetombraider-manager` | low | `{gamePath}` |
| TR Reboot Mod Manager | `shadowofthetombraider-trmodmanager` | low | `{gamePath}` |
| Special K Plugin | `shadowofthetombraider-sk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `shadowofthetombraider-manager` | 25 |
| `shadowofthetombraider-trmodmanager` | 30 |
| `shadowofthetombraider-binaries` | 35 |
| `shadowofthetombraider-modmanagermod` | 40 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **SOTTR Mod Manager**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

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
