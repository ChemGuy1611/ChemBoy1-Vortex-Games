# Notes for Mod Authors - Romestead

Packaging rules for Romestead mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Bepinex | a file or folder named `BepInEx.Core.dll`, a file or folder named `BepInEx` and a file or folder named `winhttp.dll` | - |
| Melonloader | a file or folder named `MelonLoader.dll`, a file or folder named `MelonLoader` and a file or folder named `version.dll` | - |
| Root | a file or folder named one of: `XXX_Data` or `XXX_Data` | - |
| Bepcfgman | a file or folder named `configurationmanager.dll` and a file or folder named `plugins` | `BepInEx` |
| Melonprefman | a file or folder named `melonprefmanager.il2cpp.dll` | `Mods` |
| Assemblydll | a file or folder named one of: `GameAssembly.dll` | - |
| Plugin | a file with one of these extensions: `.dll` | - |
| Assets | a file with one of these extensions: `.assets`, `.resource` or `.ress` | - |
| Fallback | - | - |

Paths are relative to the game's install folder.

## Bepinex

Recognised when the archive contains a file or folder named `BepInEx.Core.dll`, a file or folder named `BepInEx` and a file or folder named `winhttp.dll`.

## Melonloader

Recognised when the archive contains a file or folder named `MelonLoader.dll`, a file or folder named `MelonLoader` and a file or folder named `version.dll`.

## Root

Recognised when the archive contains a file or folder named one of: `XXX_Data` or `XXX_Data`.

## Bepcfgman

Recognised when the archive contains a file or folder named `configurationmanager.dll` and a file or folder named `plugins`.

Installs to: `BepInEx`

## Melonprefman

Recognised when the archive contains a file or folder named `melonprefmanager.il2cpp.dll`.

Installs to: `Mods`

## Assemblydll

Recognised when the archive contains a file or folder named one of: `GameAssembly.dll`.

## Plugin

Recognised when the archive contains a file with one of these extensions: `.dll`.

## Assets

Recognised when the archive contains a file with one of these extensions: `.assets`, `.resource` or `.ress`.

## Fallback

Handled by the `testFallback` installer. Inspect the extension source for the exact archive layout it expects.

## Rules That Apply To Every Mod Type

- Archives that contain a FOMOD installer (a `fomod` folder with `ModuleConfig.xml`) are handed to Vortex's built-in FOMOD installer instead, and none of the rules above apply.
- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

