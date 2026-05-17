# Ghost Recon Breakpoint — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Ghost Recon Breakpoint Vortex Extension |
| Engine / Structure | Ubisoft AnvilToolkit |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `ghostreconbreakpoint` |
| Executable | `GRB.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/972](https://www.nexusmods.com/site/mods/972) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Tom_Clancy%27s_Ghost_Recon_Breakpoint](https://www.pcgamingwiki.com/wiki/Tom_Clancy%27s_Ghost_Recon_Breakpoint) |

## Supported Stores

- **Steam** — `2231380`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Sound Data .pck | `ghostreconbreakpoint-sound` | high | `{gamePath}/sounddata/pc` |
| Individual Buildtables | `ghostreconbreakpoint-buildtable` | high | `{gamePath}/Extracted/DataPC_patch_01.forge/Extracted/23_-_TEAMMATE_Template.data` |
| Binaries / Root Folder | `ghostreconbreakpoint-binaries` | high | `{gamePath}` |
| Extracted Folder | `ghostreconbreakpoint-extracted` | high | `{gamePath}/.` |
| .forge Folder | `ghostreconbreakpoint-forgefolder` | high | `{gamePath}/.` |
| .data Folder | `ghostreconbreakpoint-datafolder` | high | `{gamePath}/.` |
| Loose Data Files | `ghostreconbreakpoint-loosedata` | high | `{gamePath}/.` |
| Forge Replacement | `ghostreconbreakpoint-forgefile` | high | `{gamePath}/.` |
| Root Folder | `ghostreconbreakpoint-root` | high | `{gamePath}` |
| AnvilToolkit | `ghostreconbreakpoint-atk` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ghostreconbreakpoint-atk` | 25 |
| `ghostreconbreakpoint-sound` | 27 |
| `ghostreconbreakpoint-buildtable` | 29 |
| `ghostreconbreakpoint-extracted` | 31 |
| `ghostreconbreakpoint-forgefolder` | 33 |
| `ghostreconbreakpoint-datafolder` | 35 |
| `ghostreconbreakpoint-loosedata` | 37 |
| `ghostreconbreakpoint-forgefile` | 39 |
| `ghostreconbreakpoint-root` | 41 |
| `ghostreconbreakpoint-fallback` | 43 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Game Ubisoft Plus** (`GRB_UPP.exe`)
- **Launch Vulkan Game** (`GRB_vulkan.exe`)
- **Custom Launch** (`GRB.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Settings INI
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

