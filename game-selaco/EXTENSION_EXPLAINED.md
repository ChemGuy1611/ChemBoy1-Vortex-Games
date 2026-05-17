# Selaco — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Selaco Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `selaco` |
| Executable | `SELACO.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1479](https://www.nexusmods.com/site/mods/1479) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Selaco](https://www.pcgamingwiki.com/wiki/Selaco) |

## Supported Stores

- **Steam** — `1592280`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Mod | `selaco-mod` | high | `{gamePath}/Mods` |
| Root Folder | `selaco-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `selaco-mod` | 25 |
| `selaco-root` | 47 |
| `selaco-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`SELACO.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.

