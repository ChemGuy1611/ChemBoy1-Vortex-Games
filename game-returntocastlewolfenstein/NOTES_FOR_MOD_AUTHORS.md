# Notes for Mod Authors - Return to Castle Wolfenstein

Packaging rules for Return to Castle Wolfenstein mods, so Vortex installs them to the right place.

Vortex decides what a mod is by looking at the files and folders inside the archive. It tries each installer in order and the first one that matches wins, so archive layout is what determines where your mod ends up.

## Quick Reference

| Mod Type | Archive must contain | Installs to |
| --- | --- | --- |
| Iortcw | a file or folder named `iowolfsp.x64.exe` | - |
| Realrtcw | a file or folder named `realrtcw.x64.exe` | - |
| Mainfolder | a file or folder named `Main` | the game folder itself (no subfolder) |
| Main | a file with the `.pk3` extension | `Main` |

Paths are relative to the game's install folder. Config and save mods deploy into your user profile instead, so no game-relative path is shown for them.

## Iortcw

Recognised when the archive contains a file or folder named `iowolfsp.x64.exe`.

## Realrtcw

Recognised when the archive contains a file or folder named `realrtcw.x64.exe`.

## Mainfolder

Recognised when the archive contains a file or folder named `Main`.

Installs to: the game folder itself (no subfolder)

## Main

Recognised when the archive contains a file with the `.pk3` extension.

Installs to: `Main`

## Rules That Apply To Every Mod Type

- Folder and file name matching is case-insensitive.
- Extra wrapper folders around a recognised folder are generally fine; the installer searches at any depth.

