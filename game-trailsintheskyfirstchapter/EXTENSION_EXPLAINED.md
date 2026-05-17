# Trails in the Sky 1st Chapter — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Trails in the Sky 1st Chapter Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `trailsintheskyfirstchapter` |
| Executable | `./sora_1st.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1530](https://www.nexusmods.com/site/mods/1530) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Trails_in_the_Sky_1st_Chapter](https://www.pcgamingwiki.com/wiki/Trails_in_the_Sky_1st_Chapter) |

## Supported Stores

- **Steam** — `3375780`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `pythonInstalled` | `false` |  |
| `runInShell` | `false` | the game executable is launched through a shell |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Pac Files | `trailsintheskyfirstchapter-pac` | high | `{gamePath}/pac/steam` |
| Root Folder | `trailsintheskyfirstchapter-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `trailsintheskyfirstchapter-pac` | 25 |
| `trailsintheskyfirstchapter-root` | 27 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./sora_1st.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Extract Game Files
- Cleanup Extracted Game Files
- Open Config Folder
- Open Save Folder
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

