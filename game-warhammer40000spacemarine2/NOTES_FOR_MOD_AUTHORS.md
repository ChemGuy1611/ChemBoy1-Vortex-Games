# Notes for Mod Authors - WH40K Space Marine 2

Packaging rules for WH40K Space Marine 2 mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Integrationstudio | a file or folder named `IntegrationStudio.exe` | `client_pc\root` |
| Pak | a file with one of these extensions: `.pak` | `client_pc\root\mods` |
| Root / Game Folder Mods | a `client_pc` folder | the game folder itself (no subfolder) |
| Local | a file or folder named `local` | `client_pc\root` |
| Localsub | a file or folder named one of: `ssl`, `video`, `textures`, `presets`, `texts` or `ui` | `client_pc\root\local` |
| Binaries | - | `client_pc\root\bin\pc` |

Paths are relative to the game's install folder.

## Integrationstudio

Recognised when the archive contains a file or folder named `IntegrationStudio.exe`.

Installs to: `client_pc\root`

## Pak

Recognised when the archive contains a file with one of these extensions: `.pak`.

Installs to: `client_pc\root\mods`

## Root / Game Folder Mods

For mods laid out the same way the files appear inside the game folder. Vortex copies the matched folder and everything under it straight into the game.

```text
MyRootMod.zip
└── client_pc\
    └── ... files in their real relative locations
```

**Requirements:**

- Recognised by a folder named `client_pc` or `server_pc` in the archive.

Installs to: the game folder itself (no subfolder)

**Common mistakes:**

- Zipping the folder that CONTAINS the game folders, instead of the game folders themselves, adds an extra level and misplaces every file.

## Local

Recognised when the archive contains a file or folder named `local`.

Installs to: `client_pc\root`

## Localsub

Recognised when the archive contains a file or folder named one of: `ssl`, `video`, `textures`, `presets`, `texts` or `ui`.

Installs to: `client_pc\root\local`

## Binaries

Handled by the `testBinaries` installer. Inspect the extension source for the exact archive layout it expects.

Installs to: `client_pc\root\bin\pc`

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

