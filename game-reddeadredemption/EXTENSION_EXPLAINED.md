# Red Dead Redemption — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////
Name: Red Dead Redemption Vortex Extension
Structure: 3rd-Party Mod Installer
Author: ChemBoy1
Version: 0.2.5
Date: 2025-11-14
////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `reddeadredemption` |
| Extension Version | 0.2.5 |
| Steam App ID | 2668510 |
| Epic App ID | c180bd9859624278aa20f1333918498a |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `RDR.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `?` | high | {gamePath} |
| RPF File | `?` | high | '{gamePath}', RPF_PATH |
| MagicRDR Mod (Loose) | `?` | high | '{gamePath}', MAGICMOD_PATH |
| ASI Script / Plugin | `?` | high | {gamePath} |
| ScriptHookRDR | `?` | low | {gamePath} |
| kepmehz Mod Loader | `?` | low | {gamePath} |
| Magic RDR | `?` | low | {gamePath} |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `SCRIPTHOOK_ID` | 25 |
| `MODLOADER_ID` | 27 |
| `MAGICMOD_ID` | 29 |
| `MAGIC_ID` | 31 |
| `RPF_ID` | 33 |
| `ASIPLUGIN_ID` | 35 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Magic RDR

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.) from Nexus Mods.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

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
