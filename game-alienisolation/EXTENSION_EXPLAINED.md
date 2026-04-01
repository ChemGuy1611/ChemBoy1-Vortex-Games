# Alien Isolation — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Alien Isolation Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `alienisolation` |
| Executable | `AI.exe` |

## Supported Stores

- **Steam** — `214490`
- **Epic Games Store** — `8935bb3e1420443a9789fe01758039a5`
- **GOG** — `1744178250`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Data Files | `alienisolation-datafiles` | high | `{gamePath}/DATA` |
| Binaries / Root Game Folder | `alienisolation-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `alienisolation-datafolder` | 25 |
| `alienisolation-datafiles` | 30 |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
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
