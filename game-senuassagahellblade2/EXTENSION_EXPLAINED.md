# Senua's Saga: Hellblade 2 — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Hellblade 2 Vortex Extension |
| Engine / Structure | UE5 (XBOX Integrated) |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `senuassagahellblade2` |
| Executable | `N/A` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `2461850`
- **Xbox / Microsoft Store** — `Microsoft.Superb`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Save (LocalAppData) | `senuassagahellblade2-save` | high | `{localAppData}/Hellblade2/Saved/SaveGames` |
| UE5 Paks | `senuassagahellblade2-ue5` | high | `{gamePath}/Hellblade2/Content/Paks/~mods` |
| Paks (Alt, no "~mods") | `senuassagahellblade2-pakalt` | high | `{gamePath}/Hellblade2/Content/Paks` |
| Root Game Folder | `senuassagahellblade2-root` | high | `{gamePath}` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `ue5-pak-installer` | 25 |
| `senuassagahellblade2-config` | 30 |
| `senuassagahellblade2-save` | 35 |
| `senuassagahellblade2-root` | 40 |

## Config & Save Paths

| Type | Path |
| --- | --- |
| Config | `Hellblade2/Saved/Config/Windows` |
| Save | `Hellblade2/Saved/SaveGames` |

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Xbox Game Pass Support** — detects Xbox version of the game and adjusts executable/launcher accordingly.
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
