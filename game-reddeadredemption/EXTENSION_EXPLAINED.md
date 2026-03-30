# Red Dead Redemption — Vortex Extension Explained

## Overview

| Property | Value |
|---|---|
| Name | Red Dead Redemption Vortex Extension |
| Engine / Structure | 3rd-Party Mod Installer |
| Author | ChemBoy1 |
| Version | 0.2.5 |
| Date | 2025-11-14 |

## Key Identifiers

| Property | Value |
|---|---|
| Game ID | `reddeadredemption` |
| Executable | `RDR.exe` |

## Supported Stores

- **Steam** — `2668510`
- **Epic Games Store** — `c180bd9859624278aa20f1333918498a`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
|---|---|---|---|
| Root Game Folder | `reddeadredemption-root` | high | `{gamePath}` |
| RPF File | `reddeadredemption-rpf` | high | `{gamePath}/kml/rpf` |
| MagicRDR Mod (Loose) | `reddeadredemption-magicmod` | high | `{gamePath}/MagicRDR_Mods` |
| ASI Script / Plugin | `reddeadredemption-asiplugin` | high | `{gamePath}` |
| ScriptHookRDR | `reddeadredemption-scripthook` | low | `{gamePath}` |
| kepmehz Mod Loader | `reddeadredemption-modloader` | low | `{gamePath}` |
| Magic RDR | `reddeadredemption-magicrdr` | low | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
|---|---|
| `reddeadredemption-scripthook` | 25 |
| `reddeadredemption-modloader` | 27 |
| `reddeadredemption-magicmod` | 29 |
| `reddeadredemption-magicrdr` | 31 |
| `reddeadredemption-rpf` | 33 |
| `reddeadredemption-asiplugin` | 35 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**
- **Magic RDR**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Open Config Folder
- Open Saves Folder
- View Changelog
- Open Downloads Folder

## Special Features

- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
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
