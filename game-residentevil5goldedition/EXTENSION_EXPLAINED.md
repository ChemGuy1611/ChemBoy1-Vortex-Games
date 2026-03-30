# residentevil5goldedition — Vortex Extension Explained

## Overview

```
Name: Resident Evil 5 Gold Edition Vortex Extension
Author: ChemBoy1
Version: 0.1.1
Date: 08/10/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `residentevil5goldedition` |
| Extension Version | 0.1.1 |
| Steam App ID | 21690 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `Launcher.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

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
