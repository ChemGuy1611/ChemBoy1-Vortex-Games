# Changelog

## [1.0.0] - 2026-11-20

- Added support for Lenny's Mod Loader (LML): the loader installs to the game folder and LML mods install to their own folder inside "lml".
- Added the LML Mod Manager app: it installs with Lenny's Mod Loader into a "ModManager" folder in the game folder, with a tool to launch it from Vortex.
- Added a "Download Lenny's Mod Loader" button that opens its download page inside Vortex, and a reminder when the loader is not installed that explains why it cannot be downloaded automatically.
- Added a "Browse RDR2Mods" page to browse rdr2mods.com inside Vortex and install mods from it.
- Added: loose texture and model mods without an install.xml (horse coats, clothing textures) install to "lml\stream", where LML loads them.
- Added: translations and compatibility files for a mod you already have installed (from the same Nexus Mods page) install into that mod's folder and override its files.
- Added automatic install of ScriptHookRDR2 V2 and its ASI loader from Nexus Mods when they are missing, with update notifications and a "Download ScriptHookRDR2 V2" button. Copies already in the game folder or inside another installed mod (such as the original ScriptHookRDR2 or Ultimate ASI Loader) are left alone. This replaces the official extension's "ScriptHook is missing" warning.
- Added installers for ScriptHookRDR2, its ASI loader and ASI plugins. All of them install to the game folder, each with its own mod type. Ultimate ASI Loader ("version.dll") is recognized as an ASI loader too.
- Added: ASI mods that also include an LML mod folder (such as Ambient Gang and Companion System) install both parts correctly.
- Added an installer for mods that ship an "x64", "lml", "RampageFiles" (Rampage Trainer add-ons) or "reshade-shaders" (ReShade presets) folder, which installs them to the game folder.
- Added: mods that no installer recognizes install to the game folder, with a notification so you can check where they went.
- Added a "Download Visual Redemption" button, with update notifications once it is installed.
- Added game detection for Rockstar Games Launcher installs (Steam and Epic Games Store were already detected).
- Added buttons to open the config, save and downloads folders, the PCGamingWiki, Nexus Mods and SteamDB pages, the changelog, and a bug report page.
- Added OpenIV as a tool. It uses the same tool entry as the official extension, so your OpenIV settings carry over.
- Added support for mods installed with the official Nexus Mods RDR2 extension: they move to this extension's mod types automatically, and ScriptHook and the ASI loader now deploy to the game folder instead of "scripts".
- Added a warning when the official "Red Dead Redemption 2 Support" extension is still enabled, with a button to open the Extensions page.
- Added a notice listing mods the official extension put in "mods\source\content", where the game never loads them, with an option to clean up those leftover files.
- Changed: OpenIV is no longer needed to install mods. The official extension's "mods\source\content" folder and its OpenIV packaging are no longer used.
- Changed: mods the official extension installed as .NET scripts ("scripts" folder) or DLC packs ("mods\x64\dlcpacks") keep deploying there. Newly downloaded .NET script and DLC pack mods are not recognized automatically yet.
- Changed: symlink deployment can now be selected (the official extension did not allow it).
- Changed: the game launches in offline mode (-scOfflineOnly) from Vortex, as it did with the official extension, including when launched through Steam.
- Removed the "You have to deploy before you play the game" reminder.

## [0.1.0] - 2025-11-19

- Inital Release
