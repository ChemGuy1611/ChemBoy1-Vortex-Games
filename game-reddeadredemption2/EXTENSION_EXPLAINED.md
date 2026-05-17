# Red Dead Redemption 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Red Dead Redemption 2 Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `reddeadredemption2` |
| Executable | `./RDR2.exe` |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Red_Dead_Redemption_2](https://www.pcgamingwiki.com/wiki/Red_Dead_Redemption_2) |

## Supported Stores

- **Steam** — `1174180`
- **Epic Games Store** — `Heather`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `reddeadredemption2-mod` | high | `{gamePath}/mods` |
| Root Folder | `reddeadredemption2-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `reddeadredemption2-root` | 47 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./RDR2.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

