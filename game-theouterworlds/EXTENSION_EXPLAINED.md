# The Outer Worlds — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | The Outer Worlds Vortex Extension |
| Engine / Structure | UE4 |
| Author | ChemBoy1 |
| Version | 0.5.1 |
| Date | 2026-02-07 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `theouterworlds` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `578650`
- **Epic Games Store** — `Rosemallow`
- **GOG** — `1242541569`
- **Xbox / Microsoft Store** — `PrivateDivision.TheOuterWorldsWindows10`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Paks | `theouterworlds-pak` | low | `{gamePath}/Indiana/Content/Paks/~mods` |
| Root Game Folder | `theouterworlds-root` | high | `{gamePath}` |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch** (`TheOuterWorlds.exe`)
- **Custom Launch** (`TheOuterWorldsSpacersChoiceEdition.exe`)

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open PCGamingWiki Page
- View Changelog
- Submit Bug Report
- Open Downloads Folder

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Version Detection** — detects game version (Steam/Xbox/GOG/Demo) and adjusts paths accordingly.
- **Required Extensions** — depends on: `Unreal Engine Mod Installer`.

## How Mod Installation Works

```
User drops archive into Vortex
  └── Each installer's test() runs in priority order
       └── First supported=true wins
            └── install() returns copy instructions + setmodtype
                 └── Vortex stages files
                      └── User deploys
                           └── Vortex links/copies to game folder
                                └── did-deploy fires → post-deploy logic runs
```

## Entry Point

The extension is registered via `module.exports = { default: main }`. The `main(context)` function calls `applyGame(context, spec)` which registers the game, mod types, installers, and actions with Vortex.
