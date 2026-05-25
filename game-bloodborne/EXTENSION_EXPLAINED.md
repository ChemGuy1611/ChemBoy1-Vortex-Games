# Bloodborne — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Bloodborne Vortex Extension |
| Engine / Structure | Emulation Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `bloodborne` |
| Executable | `N/A` |
| Extension Page | [https://www.nexusmods.com/bloodborne/mods/64](https://www.nexusmods.com/bloodborne/mods/64) |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Game Data (dvdroot_ps4) | `bloodborne-dvdroot_ps4` | high | `{gamePath}/CUSA03173/dvdroot_ps4` |
| Save | `bloodborne-save` | high | `{gamePath}/user/savedata/1/CUSA03173/SPRJ0005` |
| Root Folder | `bloodborne-root` | high | `{gamePath}` |
| shadPS4 | `bloodborne-shadps4` | low | `{gamePath}` |
| shadPS4QtLauncher | `bloodborne-shadps4qtlauncher` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `bloodborne-shadps4` | 25 |
| `bloodborne-shadlauncher` | 27 |
| `bloodborne-smithbox` | 29 |
| `bloodborne-flver` | 31 |
| `bloodborne-dvdroot_ps4` | 33 |
| `bloodborne-save` | 35 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **shadPS4 (No-GUI)** (`shadps4.exe`)
- **shadPS4QtLauncher** (`shadps4qtlauncher.exe`)
- **Smithbox** (`smithbox.exe`)
- **Flver Editor** (`flver_editor.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${SHADLAUNCHER_NAME}
- View Changelog
- Submit Bug Report
- Open Downloads Folder
- Open PCGamingWiki Page

## Config & Save Paths

| Type | Path |
| --- | --- |
| Save | `user/savedata/1/CUSA03173/SPRJ0005` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).

