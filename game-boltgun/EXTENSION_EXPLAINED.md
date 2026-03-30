# Warhammer 40,000: Boltgun — Vortex Extension Explained

## Overview

```
Name: WH40K Boltgun Vortex Extension
Structure: UE4 (Basic)
Author: ChemBoy1
Version: 0.3.0
Date: 08/05/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `warhammer40000boltgun` |
| Extension Version | 0.3.0 |
| Steam App ID | 2005010 |
| Epic App ID | 7425a2db41cf4574a957363a79813ac1 |
| GOG App ID | 2028053392 |
| Xbox App ID | FocusHomeInteractiveSA.Boltgun-Windows |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| ``${GAME_ID}-root`` | 25 |

Each installer has a paired **test** function (detects the archive type) and an **install** function (produces `copy` instructions telling Vortex where to place each file).

## Special Features

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
