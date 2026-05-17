# Mirthwood — Vortex Extension Explained

## Overview

| Property | Value |
| --- | --- |
| Name | Mirthwood Vortex Extension |
| Engine / Structure | Unity BepinEx |
| Author | ChemBoy1 |

## Key Identifiers

| Property | Value |
| --- | --- |
| Game ID | `mirthwood` |
| Executable | `Mirthwood.exe` |
| Extension Page | [https://www.nexusmods.com/site/mods/1272](https://www.nexusmods.com/site/mods/1272) |
| PCGamingWiki | [XXX](XXX) |

## Supported Stores

- **Steam** — `2272900`

## Mod Types

Mod types define where each category of mod gets deployed:

| Name | ID | Priority | Target Path |
| --- | --- | --- | --- |
| Root Game Folder | `mirthwood-root` | high | `{gamePath}` |
| BepinEx Mod | `mirthwood-bepmods` | high | `{gamePath}/BepinEx/plugins` |

## Toolbar Actions

These buttons appear in the Vortex mod-icons toolbar when this game is active:

- View Changelog
- Open Downloads Folder
- Open PCGamingWiki Page
- Submit Bug Report

## Special Features

- **FOMOD Awareness** — installers check for and skip `fomod/ModuleConfig.xml` to avoid conflicts with the built-in FOMOD installer.
- **Registry Lookup** — uses Windows registry for game detection or configuration paths.
- **Required Extensions** — depends on: `modtype-bepinex`.

