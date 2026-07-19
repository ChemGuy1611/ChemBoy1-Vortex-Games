# Dragon Age: The Veilguard — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dragon Age: The Veilguard Vortex Extension |
| Engine / Structure | 3rd Party Mod Manager (Frosty) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dragonagetheveilguard` |
| Executable | `Dragon Age The Veilguard.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1075](https://www.nexusmods.com/site/mods/1075) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Dragon_Age:_The_Veilguard](https://www.pcgamingwiki.com/wiki/Dragon_Age:_The_Veilguard) |

## Supported Stores

- **Steam** — `1845910`
- **Epic Games Store** — `chamaelejp`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Folder | `dragonagetheveilguard-root` | high | `{gamePath}` |
| DAVExtender | `dragonagetheveilguard-davex` | low | `{gamePath}/.` |
| SDK Patch (EA/Epic) | `dragonagetheveilguard-sdkpatch` | low | `{gamePath}/FrostyModManager/Profiles` |
| Frosty .fbmod/.archive | `dragonagetheveilguard-frostymod` | high | `{gamePath}/FrostyModManager/Mods/Dragon Age The Veilguard` |
| Frosty Mod Manager | `dragonagetheveilguard-frostymanager` | low | `{gamePath}/FrostyModManager` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dragonagetheveilguard-frostymanager` | 25 |
| `dragonagetheveilguard-davex` | 27 |
| `dragonagetheveilguard-sdkpatch` | 29 |
| `dragonagetheveilguard-frostymod` | 33 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game** (`frostymodmanager.exe`)
- **Direct Launch** (`Dragon Age The Veilguard.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download DAVExtender
- Download SDK Patch Latest (EA/Epic)
- Remove ${SDKPATCH_NAME}
- Delete ModData Folder
- Open Frosty ${FROSTY_CONFIG_FILE}
- Open FMM GitHub Page
- Open Config Folder
- Open Saves Folder
- Open Frosty Mods Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

