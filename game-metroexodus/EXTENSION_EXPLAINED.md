# Metro Exodus Vortex Extension — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Metro Exodus Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |
| Version | 0.1.2 |
| Date | 01/06/2025 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `metroexodus` |
| Executable | `MetroExodus.exe` |

## Supported Stores

- **Steam** — `1449560`
- **Epic Games Store** — `153e4dd8955e452aa60ba9ba2d906bf1`
- **GOG** — `1407287452`

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Metro Exodus SDK**

## Special Features

- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.

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
