# Bloodthief — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Bloodthief Vortex Extension |
| Engine / Structure | Godot Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `bloodthief` |
| Executable | `bloodthief.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1528](https://www.nexusmods.com/site/mods/1528) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Bloodthief](https://www.pcgamingwiki.com/wiki/Bloodthief) |

## Supported Stores

- **Steam** — `2533600`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `customLoader` | `true` | enables custom mod loader support |
| `keepZips` | `false` | downloaded tool archives are kept on disk after extraction |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Godot Mod | `bloodthief-mod` | high | `{gamePath}/mods-unpacked` |
| Godot Mod Loader | `bloodthief-godotmodloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `bloodthief-godotmodloader` | 25 |
| `bloodthief-mod` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`bloodthief.exe`)
- **Console Launch** (`bloodthief.console.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open override.cfg
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Godot Mod Loader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

