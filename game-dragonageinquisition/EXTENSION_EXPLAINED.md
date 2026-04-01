# Dragon Age: Inquisition — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dragon Age Inquisition Vortex Extension |
| Engine / Structure | 3rd-Party Mod Manager (Frosty) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dragonageinquisition` |
| Executable | `DragonAgeInquisition.exe` |

## Supported Stores

- **Steam** — `1222690`
- **Epic Games Store** — `verdi`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries / Root Game Folder | `dragonageinquisition-binaries` | high | `{gamePath}` |
| Frosty Mod .fbmod | `dragonageinquisition-frostymod` | high | `{gamePath}/FrostyModManager/Mods/dragonageinquisition` |
| DAIMod .daimod | `dragonageinquisition-daimod` | high | `{gamePath}/DAIMod` |
| Config / Save File | `dragonageinquisition-configsave` | high | `CONFIG_PATH` |
| Frosty Plugin | `dragonageinquisition-frostyplugin` | high | `{gamePath}/FrostyModManager/Plugins` |
| Update Folder | `dragonageinquisition-update` | high | `{gamePath}/Update` |
| DAI Mod Manager | `dragonageinquisition-daimanager` | low | `{gamePath}` |
| Frosty Mod Manager | `dragonageinquisition-frostymanager` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dragonageinquisition-daimodmanager` | 25 |
| `dragonageinquisition-frostymodmanager` | 30 |
| `dragonageinquisition-fbmod` | 35 |
| `dragonageinquisition-daimod` | 45 |
| `dragonageinquisition-config` | 50 |
| `dragonageinquisition-save` | 55 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Launch Modded Game**
- **Frosty Mod Manager**
- **DAI Mod Manager**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config/Save Folder
- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
