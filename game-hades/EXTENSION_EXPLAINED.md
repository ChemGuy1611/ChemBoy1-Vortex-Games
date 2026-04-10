# Hades — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hades Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `hades` |
| Executable | `x64/Hades.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `1145360`
- **Epic Games Store** — `Min`
- **Xbox / Microsoft Store** — `SupergiantGamesLLC.Hades`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `hades-mod` | high | `{gamePath}/Content/Mods` |
| Binaries | `hades-binaries` | high | `{gamePath}/x64` |
| Binaries (Vulkan) | `hades-binariesvk` | high | `{gamePath}/x64Vk` |
| Root Game Folder | `hades-root` | high | `{gamePath}` |
| Mod Importer | `hades-manager` | low | `{gamePath}/Content` |
| Mod Utility | `hades-modutility` | low | `{gamePath}/Content/Mods` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `hades-manager` | 25 |
| `hades-modutility` | 30 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Vulkan Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
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
