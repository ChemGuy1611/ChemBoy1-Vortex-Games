# Notes for Mod Authors - Return to Castle Wolfenstein

Packaging rules for Return to Castle Wolfenstein mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| ioRTCW | a `iowolfsp.x64.exe` file | the game folder |
| RealRTCW | a `realrtcw.x64.exe` file | the game folder |
| Main Folder | a `Main` folder | the game folder |
| .pk3 Data (Main) | a `.pk3` file | `Main` |

Paths are relative to the game's install folder.

## ioRTCW

Recognised when the archive contains a `iowolfsp.x64.exe` file.

Installs to: the game folder

## RealRTCW

Recognised when the archive contains a `realrtcw.x64.exe` file.

Installs to: the game folder

## Main Folder

Recognised when the archive contains a `Main` folder.

Installs to: the game folder

## .pk3 Data (Main)

Recognised when the archive contains a `.pk3` file.

Installs to: `Main`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.
