# Dark Messiah \tof Might & Magic — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dark Messiah of Might & Magic Vortex Extension |
| Engine / Structure | Basic (Launcher) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `darkmessiahofmightandmagic` |
| Executable | `mm.exe` |

## Supported Stores

- **Steam** — `2100`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `darkmessiahofmightandmagic-root` | high | `{gamePath}` |
| Game Data Folder | `darkmessiahofmightandmagic-data` | high | `{gamePath}` |
| Data Subfolder | `darkmessiahofmightandmagic-datasub` | high | `{gamePath}/mm` |
| Materials Subfolder | `darkmessiahofmightandmagic-materialssub` | high | `{gamePath}/mm/materials` |
| VPK Files | `darkmessiahofmightandmagic-vpk` | high | `{gamePath}/vpks` |
| Maps (.bsp) | `darkmessiahofmightandmagic-maps` | high | `{gamePath}/mm/maps` |
| Save | `darkmessiahofmightandmagic-save` | high | `{gamePath}/mm/SAVE` |
| Config | `darkmessiahofmightandmagic-config` | high | `{gamePath}/mm/cfg` |
| Launcher Mod | `darkmessiahofmightandmagic-launchermod` | high | `{gamePath}/_mods` |
| wiltOS Mod Launcher | `darkmessiahofmightandmagic-launcher` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `darkmessiahofmightandmagic-launcher` | 25 |
| `darkmessiahofmightandmagic-unlimited` | 27 |
| `darkmessiahofmightandmagic-root` | 29 |
| `darkmessiahofmightandmagic-launchermod` | 31 |
| `darkmessiahofmightandmagic-data` | 33 |
| `darkmessiahofmightandmagic-datasub` | 35 |
| `darkmessiahofmightandmagic-vpk` | 37 |
| `darkmessiahofmightandmagic-materialssub` | 39 |
| `darkmessiahofmightandmagic-maps` | 41 |
| `darkmessiahofmightandmagic-save` | 43 |
| `darkmessiahofmightandmagic-config` | 45 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Game**
- **RTX Remix Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download wOS Mod Launcher (Manual)
- Open config.cfg
- Open Saves Folder

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `mm/cfg` |
| Save | `mm/SAVE` |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
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
