# Dying Light: The Beast — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Dying Light The Beast Vortex Extension |
| Engine / Structure | Basic Game |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `dyinglightthebeast` |
| Executable | `ph_ft/work/bin/x64/DyingLightGame_TheBeast_x64_rwdi.exe` |
| Executable (Xbox) | `gamelaunchhelper.exe` |

## Supported Stores

- **Steam** — `3008130`
- **Epic Games Store** — `32eba9473a5642ac947f33b7130094b1`

## Feature Flags

| Flag | Value | Description |
| --- | --- | --- |
| `DOTNET_INSTALLED` | `false` |  |
| `superMergerInstalled` | `false` |  |
| `mergerInstalled` | `false` |  |
| `hasVariants` | `false` |  |

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Pak Mod (Merged) | `dyinglightthebeast-pak` | high | `{gamePath}/ph_ft/mods` |
| Root Folder | `dyinglightthebeast-root` | high | `{gamePath}` |
| Binaries (Engine Injector) | `dyinglightthebeast-binaries` | high | `{gamePath}/ph_ft/work/bin/x64` |
| UTM Mod Merger Utility | `dyinglightthebeast-mergerutility` | low | `{gamePath}/ph_ft` |
| Super Mod Merger | `dyinglightthebeast-supermerger` | low | `{gamePath}/ph_ft` |

## Mod Installers

Installers run in priority order (lower number = tested first). The first installer whose test returns `supported: true` handles the archive.

| Installer ID | Priority |
| --- | --- |
| `dyinglightthebeast-mergerutility` | 25 |
| `dyinglightthebeast-supermerger` | 27 |
| `dyinglightthebeast-pak` | 29 |
| `dyinglightthebeast-root` | 47 |
| `dyinglightthebeast-binaries` | 49 |

## Registered Tools

These tools appear in Vortex's Tools panel when this game is active:

- **Custom Launch**

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- Download ${SUPERMERGER_NAME} 
- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **Deploy Hook** (`did-deploy`) — runs custom logic (e.g., notifications, metadata patching) every time mods are deployed.
- **Purge Hook** (`did-purge`) — runs custom logic when mods are purged.
- **Auto-Downloader** — can automatically download required tools (mod loader, managers, etc.).
- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Epic Games Store Support** — detects EGS version and uses the Epic launcher.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.

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
