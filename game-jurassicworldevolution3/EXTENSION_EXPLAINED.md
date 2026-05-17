# Jurassic World Evolution 3 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Jurassic World Evolution 3 Vortex Extension |
| Engine / Structure | Cobra Engine (ACSE) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `jurassicworldevolution3` |
| Executable | `JWE3.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1503](https://www.nexusmods.com/site/mods/1503) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Jurassic_World_Evolution_3](https://www.pcgamingwiki.com/wiki/Jurassic_World_Evolution_3) |

## Supported Stores

- **Steam** — `2958130`
- **Epic Games Store** — `642f83b4166d4dc7887d798b04337ea8`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| ACSE | `jurassicworldevolution3-acse` | high | `{gamePath}/Win64/ovldata` |
| Root Game Folder | `jurassicworldevolution3-root` | high | `{gamePath}` |
| ovldata Subfolder | `jurassicworldevolution3-ovldata` | high | `{gamePath}/Win64` |
| ACSE Localization | `jurassicworldevolution3-localised` | high | `{gamePath}/Win64/ovldata/ACSE` |
| Movies (.webm) | `jurassicworldevolution3-movies` | high | `{gamePath}/Movies` |
| Saves | `jurassicworldevolution3-save` | high | `USER_HOME/Saved Games/Frontier Developments/Jurassic World Evolution 3/USERID_FOLDER/Saves` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `jurassicworldevolution3-acse` | 25 |
| `jurassicworldevolution3-root` | 27 |
| `jurassicworldevolution3-localised` | 29 |
| `jurassicworldevolution3-movies` | 31 |
| `jurassicworldevolution3-ovldata` | 33 |
| `jurassicworldevolution3-save` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`JWE3.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Save Folder
- Open Config Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| ACSE | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

