# Diplomacy is Not an Option — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Diplomacy Is Not An Option Vortex Extension |
| Engine / Structure | Unity BepinEx (Custom Nexus Download) |
| Author | ChemBoy1 |
| Version | 0.1.0 |
| Date | 10/18/2024 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `diplomacyisnotanoption` |
| Executable | `Diplomacy is Not an Option.exe` |

## Supported Stores

- **Steam** — `1272320`
- **GOG** — `1946916562`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `diplomacyisnotanoption-root` | high | `{gamePath}` |
| BepinEx Mod | `diplomacyisnotanoption-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Required Extensions** — depends on: `modtype-bepinex`.

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
