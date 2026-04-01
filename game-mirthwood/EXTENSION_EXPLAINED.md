# Mirthwood — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Mirthwood Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |
| Version | 0.1.1 |
| Date | 2025-05-14 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `mirthwood` |
| Executable | `Mirthwood.exe` |
| PCGamingWiki | XXX |

## Supported Stores

- **Steam** — `2272900`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `mirthwood-root` | high | `{gamePath}` |
| BepinEx Mod | `mirthwood-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder

## Special Features

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
