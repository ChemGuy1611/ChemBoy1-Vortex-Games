# Warhammer - Vermintide 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Warhammer Vermintide 2 Vortex Extension |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `vermintide2` |
| Executable | `launcher/Launcher.exe` |

## Supported Stores

- **Steam** — `552500`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Binaries | `vermintide2-binaries` | high | `{gamePath}/binaries` |
| Binaries DX12 | `vermintide2-binariesdx12` | high | `{gamePath}/binaries_dx12` |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

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
