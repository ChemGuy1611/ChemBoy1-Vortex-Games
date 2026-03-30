# System Shock 2: 25th Anniversary Remaster — Vortex Extension Explained

## Overview

```
////////////////////////////////////////////////
Name: System Shock 2 (Classic AND 25th Anniversary Remaster) Vortex Extension
Structure: Basic game w/ mods folder
Author: ChemBoy1
Version: 0.4.7
Date: 2026-01-19
////////////////////////////////////////////////
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `systemshock225thanniversaryremaster` |
| Extension Version | 0.4.7 |
| Steam App ID | 866570 |
| Epic App ID | 2feb2f328922458e9f698f620fbddc13 |
| GOG App ID | 1448370350 |
| Xbox App ID | N/A |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `MOD_ID` | 25 |
| `LEGACY_ID` | 27 |
| `LEGACY_ID` | 27 |
| ``${ROOT_ID}folder`` | 29 |
| `ROOT_ID` | 31 |
| `CLASSIC_ID` | 33 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- **Open Config/Save Folder**
- **View Changelog**
- **Open Downloads Folder**
- **Download and/or Run SS2Tool**
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
