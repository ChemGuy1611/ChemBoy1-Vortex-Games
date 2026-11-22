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
| Extension Page | [https://www.nexusmods.com/site/mods/2627](https://www.nexusmods.com/site/mods/2627) |
| PCGamingWiki | [https://www.pcgamingwiki.com/wiki/Red_Dead_Redemption_2](https://www.pcgamingwiki.com/wiki/Red_Dead_Redemption_2) |

## Supported Stores

- **Steam** — `1174180`
- **Epic Games Store** — `Heather`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `allowSymlinks` | `true` | true if game can use symlinks without issues. Typically needs to be false if files have internal references (i.e. pak/ucas/utoc or ba2/esp) |
| `needsModInstaller` | `true` | set to true if standard mods should run through an installer - set false to have mods installed to the mods folder without any processing |
| `rootInstaller` | `true` | enable root installer. Set false if you need to avoid installer collisions |
| `fallbackInstaller` | `true` | enable fallback installer. Set false if you need to avoid installer collisions |
| `hasUserIdFolder` | `true` | true if there is a folder in the Save path that is a user ID that must be read (i.e. Steam ID) |
| `rdr2modsBrowser` | `true` | true to add a sidebar page for browsing and installing mods from rdr2mods.com |
| `debug` | `false` | toggle for debug mode |
| `mod_update_all_profile` | `false` | for mod update to keep them in the load order and not uncheck them |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Folder | `reddeadredemption2-root` | high | `{gamePath}` |
| Lenny's Mod Loader | `reddeadredemption2-modloader` | high | `{gamePath}` |
| ScriptHookRDR2 | `reddeadredemption2-scripthook` | high | `{gamePath}` |
| ASI Loader | `reddeadredemption2-asiloader` | high | `{gamePath}` |
| ASI Plugin | `reddeadredemption2-asiplugin` | high | `{gamePath}` |
| LML Mod | `reddeadredemption2-mod` | high | `{gamePath}/lml` |
| Config | `reddeadredemption2-config` | 60 | `?` |
| Save | `reddeadredemption2-save` | 62 | `?` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `reddeadredemption2-variant` | 25 |
| `reddeadredemption2-addon` | 26 |
| `reddeadredemption2-modloader` | 27 |
| `reddeadredemption2-scripthook` | 28 |
| `reddeadredemption2-root` | 29 |
| `reddeadredemption2-asiloader` | 30 |
| `reddeadredemption2-asiplugin` | 33 |
| `reddeadredemption2dotnet` | 34 |
| `reddeadredemption2-mod` | 35 |
| `reddeadredemption2-config` | 37 |
| `reddeadredemption2-save` | 39 |
| `reddeadredemption2-fallback` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`./RDR2.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download Lenny's Mod Loader
- Download ScriptHookRDR2 V2
- Download Visual Redemption
- Open Config Folder
- Open Save Folder
- Open PCGamingWiki Page
- Open Nexus Mods Page
- Open SteamDB Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
