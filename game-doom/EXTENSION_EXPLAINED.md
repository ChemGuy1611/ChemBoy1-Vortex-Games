# DOOM (2016) — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | DOOM (2016) Vortex Extension |
| Engine / Structure | 3rd party mod loader |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `doom` |
| Executable | `DOOMx64vk.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/677](https://www.nexusmods.com/site/mods/677) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Doom_%282016%29](https://www.pcgamingwiki.com/wiki/Doom_%282016%29) |

## Supported Stores

- **Steam** — `379720`
- **GOG** — `1390579243`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `doom-binaries` | high | `{gamePath}` |
| Loader Mods | `doom-mods` | high | `{gamePath}/Mods` |
| DOOM Legacy Mod | `doom-legacy` | high | `{gamePath}` |
| Version Rollback Files | `doom-rollback` | low | `{gamePath}` |
| DOOMModLoader | `doom-modloader` | low | `{gamePath}` |
| DOOMLauncher | `doom-launcher` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `doom-modloader` | 25 |
| `doom-launcher` | 27 |
| `doom-legacy` | 29 |
| `doom-rollback` | 31 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded DOOM** (`DOOMx64vk.exe`)
- **DOOMLauncher** (`doomlauncher.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Saves Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| DOOMModLoader | — | — |

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).

