# Balatro — Vortex Extension Explained

## Overview

```
///////////////////////////////////////
Name: Balatro Vortex Extension
Structure: Mod Loader (Mods in AppData Folder)
Author: ChemBoy1
Version: 0.2.0
Date: 2026-02-24
///////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `balatro` |
| Extension Version | 0.2.0 |
| Steam App ID | 2379780 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | PlayStack.Balatro |
| Executable | `N/A` |
| Extension Page | https://www.nexusmods.com/site/mods/1315 |
| PCGamingWiki | https://www.pcgamingwiki.com/wiki/Balatro |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `LOVELY_ID` | 25 |
| `STEAMMODDED_ID` | 27 |
| `MALVERK_ID` | 29 |
| `MOD_ID` | 29 |
| `CONFIG_ID` | 31 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config File**
- **Open Save Folder (Steam)**
- **Download Lovely-Injector Latest**
- **Download ${MALVERK_NAME} Latest**
- **Open PCGamingWiki Page**
- **View Changelog**
- **Submit Bug Report**
- **Open Downloads Folder**

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex symlinks/copies to game folder
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
