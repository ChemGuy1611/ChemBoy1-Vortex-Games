# Changelog

## [0.4.2]
- Removed an obsolete parameter that caused downloading updates from the Moddding Tools domain, including AnvilToolkit, to fail with wrong URL
- Removed 'site' from compatibleDownloads, as it would cause all mods from the Modding Tools domain the user has installed to show up as uninstalled mods in the mod list

## [0.4.1]
- Added function to automatically copy d3d11.dll from system folder to game folder if the user installed ResoRep.

## [0.4.0]
- Drastically improved user experience when using ResoRep Textures. The extension will write a dllsettings.ini file to the game's root folder if it doesn't already exist. This file is used by ResoRep to locate the game and the modded textures folder. A notification presents users with the option to download ResoRep dll files with an installer script from Nexus Mods if they don't already have them.

## [0.2.0]
- Added additional mod installers to attempt to repackage poorly packaged ATK mods into the correct "Extracted" folder structure to be repacked by ATK
- Added installer for root folders ("videos", "sounddata")
- Added notification after deployment to run ATK