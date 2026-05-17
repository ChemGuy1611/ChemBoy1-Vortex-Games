# Road to Vostok — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Road to Vostok Vortex Extension |
| Engine / Structure | Godot Engine Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `roadtovostok` |
| Executable | `RTV.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1853](https://www.nexusmods.com/site/mods/1853) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Road_to_Vostok](https://www.pcgamingwiki.com/wiki/Road_to_Vostok) |

## Supported Stores

- **Steam** — `1963610`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `hasXbox` | `false` | toggle for Xbox version logic |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `customLoader` | `true` | enables custom mod loader support |
| `keepZips` | `false` | downloaded tool archives are kept on disk after extraction |
| `debug` | `false` | toggle for debug mode |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Godot Mod | `roadtovostok-mod` | high | `{gamePath}/mods` |
| ModConfigurationMenu | `roadtovostok-mcm` | low | `{gamePath}/mods` |
| Metro Mod Loader | `roadtovostok-godotmodloader` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `roadtovostok-godotmodloader` | 25 |
| `roadtovostok-mcm` | 26 |
| `roadtovostok-mod` | 31 |
| `roadtovostok-mod-rezip` | 33 |
| `roadtovostok-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`RTV.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Latest ${MCM_NAME}
- Open Modworkshop Page
- Open Config Folder
- Open override.cfg
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Auto-Downloaded Dependencies

| Dependency | Version | Details |
| --- | --- | --- |
| Metro Mod Loader | — | — |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

