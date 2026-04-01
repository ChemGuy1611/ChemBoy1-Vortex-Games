# Warhammer 40,000: Boltgun — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | WH40K Boltgun Vortex Extension |
| Engine / Structure | UE4 (Basic) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `warhammer40000boltgun` |
| Executable | `N/A` |

## Supported Stores

- **Steam** — `2005010`
- **Epic Games Store** — `7425a2db41cf4574a957363a79813ac1`
- **GOG** — `2028053392`
- **Xbox / Microsoft Store** — `FocusHomeInteractiveSA.Boltgun-Windows`

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `warhammer40000boltgun-root` | 25 |

## Special Features

- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.

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
