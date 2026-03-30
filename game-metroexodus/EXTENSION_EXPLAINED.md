# metroexodus — Vortex Extension Explained

## Overview

```
Name: Metro Exodus Vortex Extension
Structure: Basic Game
Author: ChemBoy1
Version: 0.1.2
Date: 01/06/2025
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `metroexodus` |
| Extension Version | 0.1.2 |
| Steam App ID | 1449560 |
| Epic App ID | 153e4dd8955e452aa60ba9ba2d906bf1 |
| GOG App ID | 1407287452 |
| Xbox App ID | N/A |
| Executable | `MetroExodus.exe` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- Metro Exodus SDK

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
