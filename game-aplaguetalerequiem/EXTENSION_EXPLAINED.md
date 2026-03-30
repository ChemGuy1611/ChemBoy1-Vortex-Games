# A Plague Tale: Requiem — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: A Plague Tale Requiem Vortex Extension
Structure: Basic Game (XBOX Integrated)
Author: ChemBoy1
Version: 1.3.1
Date: 2025-11-18
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `aplaguetalerequiem` |
| Extension Version | 1.3.1 |
| Steam App ID | 1182900 |
| Epic App ID | N/A |
| GOG App ID | 1552771812 |
| Xbox App ID | FocusHomeInteractiveSA.APlagueTaleRequiem-Windows |
| Executable | `APlagueTaleRequiem_x64.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `ROOT_ID` | 25 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Custom Launch
- Custom Launch

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config Folder**
- **Open Saves Folder**
- **View Changelog**
- **Open Downloads Folder**

## Special Features

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
