# Resident Evil 5 Gold Edition — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Resident Evil 5 Gold Edition Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `residentevil5goldedition` |
| Executable | `Launcher.exe` |

## Supported Stores

- **Steam** — `21690`

## Special Features

- No special features beyond the standard extension pattern.

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
