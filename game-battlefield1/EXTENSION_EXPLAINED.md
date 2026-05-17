# Battlefield 1 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Battlefield 1 Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `battlefield1` |
| Executable | `bf1.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/847](https://www.nexusmods.com/site/mods/847) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Battlefield_1](https://www.pcgamingwiki.com/wiki/Battlefield_1) |

## Supported Stores

- **Steam** — `1238840`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries (Engine Injector) | `battlefield1-binaries` | high | `{gamePath}` |
| Frosty .fbmod | `battlefield1-frostymod` | high | `{gamePath}/FrostyModManager/Mods/bf1` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `masseffectandromeda-frostymodmanager` | 25 |
| `masseffectandromeda-fbmod` | 30 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`frostymodmanager.exe`)
- **Frosty Mod Manager** (`frostymodmanager.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

