# Middle-earth: Shadow of War — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Middle-earth: Shadow of War Vortex Extension |
| Engine / Structure | Mod Loaders + Mods folder w/ LO support |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `middleearthshadowofwar` |
| Executable | `x64/ShadowOfWar.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |
| Executable (GOG) | `x64/ShadowOfWar.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/375](https://www.nexusmods.com/site/mods/375) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Middle-earth:_Shadow_of_War](https://www.pcgamingwiki.com/wiki/Middle-earth:_Shadow_of_War) |

## Supported Stores

- **Steam** — `356190`
- **GOG** — `1324471032`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `LOAD_ORDER_ENABLED` | `true` | enables load order sorting |
| `dllLoaderInstalled` | `false` |  |
| `modLoaderInstalled` | `false` |  |
| `mod_update_all_profile` | `false` |  |
| `updating_mod` | `false` | used to see if it's a mod update or not |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| .arch06 Mod | `middleearthshadowofwar-arch06mod` | high | `{gamePath}/Mods` |
| Plugins / Packets | `middleearthshadowofwar-pluginsandpackets` | high | `{gamePath}/x64/plugins` |
| Root Folder | `middleearthshadowofwar-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `middleearthshadowofwar-binaries` | high | `{gamePath}/x64` |
| Packet Loader | `middleearthshadowofwar-packetloader` | low | `{gamePath}/x64/plugins` |
| DLL Loader | `middleearthshadowofwar-dllloader` | low | `{gamePath}/x64` |
| Middle-Earth-Mod-Loader | `middleearthshadowofwar-modloader` | low | `{gamePath}/x64` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `middleearthshadowofwar-packetloader` | 25 |
| `middleearthshadowofwar-dllloader` | 27 |
| `middleearthshadowofwar-modloader` | 29 |
| `middleearthshadowofwar-arch06mod` | 31 |
| `middleearthshadowofwar-pluginsandpackets` | 33 |
| `middleearthshadowofwar-root` | 35 |
| `middleearthshadowofwar-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`x64/ShadowOfWar.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open default.archcfg File
- Open ${PACKETLOADER_INI}
- Open Config / Save Folder
- Download Middle-Earth-Mod-Loader
- Get MEML Mods (GitHub)
- Open PCGamingWiki Page
- View Changelog
- Open Downloads Folder
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **GOG Support** — detects GOG version with adjusted executable/data paths.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

