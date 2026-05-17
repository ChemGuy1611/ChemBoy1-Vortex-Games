# Helldivers 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Helldivers 2 Vortex Extension |
| Engine / Structure | Custom Game Data |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `helldivers2` |
| Executable | `bin/helldivers2.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/845](https://www.nexusmods.com/site/mods/845) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Helldivers_2](https://www.pcgamingwiki.com/wiki/Helldivers_2) |

## Supported Stores

- **Steam** — `553850`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Game Data (.dl_bin) | `helldivers2-data` | high | `{gamePath}/data/game` |
| Data Stream File (.stream) | `helldivers2-stream` | high | `{gamePath}/data` |
| Binaries (Engine Injector) | `helldivers2-binaries` | high | `{gamePath}/bin` |
| helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE | `helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE` | 25 | `?` |
| helldivers2-soundpatch | `helldivers2-soundpatch` | 30 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `helldivers2-data` | 25 |
| `helldivers2-patch--MergedMods--This-is-fine--Ignore-this--SELECT-APPLY-CHANGES--DO-NOT-ENABLE` | 27 |
| `helldivers2-soundpatch` | 27 |
| `helldivers2-stream` | 31 |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

