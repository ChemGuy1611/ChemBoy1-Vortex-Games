# vermintide2 — Vortex Extension Explained

## Overview

```
Name: Warhammer Vermintide 2 Vortex Extension
Author: ChemBoy1
Version: 1.0.5
Date: 07/31/2024
```

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `vermintide2` |
| Extension Version | 1.0.5 |
| Steam App ID | 552500 |
| Epic App ID | N/A |
| GOG App ID | N/A |
| Xbox App ID | N/A |
| Executable | `N/A` |

## Feature Flags

| Flag | Value | Meaning |
|---|---|---|

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Binaries | `vermintide2-binaries` | high | '{gamePath}', "binaries" |
| Binaries DX12 | `vermintide2-binariesdx12` | high | '{gamePath}', "binaries_dx12" |

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
                           └── Vortex symlinks/copies to game folder
```

## Entry Point

The extension is registered via:

```js
module.exports = { default: main };
```

The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
