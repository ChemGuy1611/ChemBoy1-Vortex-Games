# Unity Mod Manager

`https://www.nexusmods.com/site/mods/21` — "UMM", a general-purpose mod loader and mod manager for
Mono and IL2CPP Unity games. It is not game-specific: one build ships a list of 113 supported games
and patches whichever one the user points it at, so it is worth documenting once here rather than
per game.

Three properties shape every Vortex extension built on UMM, and each one breaks an assumption that
would otherwise be reasonable:

- **Nexus is the only distribution channel.** The GitHub repository has zero releases and zero tags,
  so a GitHub-releases downloader has nothing to resolve.
- **The installer has no command line.** `Main()` takes no arguments and opens a WinForms window, so
  no automation can drive it. Anything Vortex wants applied without user interaction has to be
  reproduced as installer instructions instead.
- **Its default install type is pure file copies.** That is what makes reproducing it practical: the
  DoorstopProxy route copies a handful of files and writes two small text files, with no assembly
  patching involved.

---

## Distribution

| Property | Value |
| --- | --- |
| Home | `https://www.nexusmods.com/site/mods/21` (domain `site`, mod ID `21`) |
| Current version | 0.33.0 |
| GitHub | Source only — **no releases, no tags** |
| Archive root folder | `UnityModManagerInstaller/` |

Because there is no GitHub release stream, the GitHub-releases downloader module (`DOWNLOADER.md`)
cannot be used. The route is the inline-Nexus one every other Nexus-hosted requirement uses:
`api.ext.nexusGetModFiles('site', 21)`, newest file with `category_id === 1` wins, fall back to a
hardcoded file ID, then `start-download` followed by `start-install-download`.

**Do not match the archive by name.** Nexus changed its file-naming convention: names now carry
spaces and a random suffix, for example
`UnityModManager 21 0.33.0 2026-08-19T17-23Z U5RqIwYsY.zip`. Any logic that string-matches an
archive name against a known-versions table is already broken by this — which is precisely how the
`modtype-umm` helper extension bundled with Vortex fails (see *Why the bundled helper extension is
unusable* below).

### Archive layout

```text
UnityModManagerInstaller/
    UnityModManager.exe
    UnityModManager.dll
    UnityModManager.xml
    0Harmony.dll
    dnlib.dll
    System.Xml.dll
    Ionic.Zip.dll
    Newtonsoft.Json.dll
    Console.exe
    Downloader.exe
    winhttp_x64.dll
    winhttp_x86.dll
    UnityModManagerConfig.xml
    UnityModManagerConfigLocal.xml
    Harmony/1.2/*
    Harmony/2.2/0Harmony.dll
    libdoorstop*          (Unix payloads, unused on Windows)
```

---

## The supported-games list

`UnityModManagerConfig.xml` sits beside the executable and holds one `<GameInfo>` block per
supported game. `Config.Load()` also merges **every** file in that folder matching
`UnityModManagerConfig*.xml` — that is the supported way to add a game locally without editing the
shipped file, and it is why the archive also ships `UnityModManagerConfigLocal.xml`.

A `<GameInfo>` block:

```xml
<GameInfo Name="Railroader">
    <Folder>Railroader</Folder>
    <ModsDirectory>Mods</ModsDirectory>
    <ModInfo>Info.json</ModInfo>
    <GameExe>Railroader.exe</GameExe>
    <EntryPoint>[UnityEngine.CoreModule.dll]UnityEngine.Display.cctor:After</EntryPoint>
    <StartingPoint>[Assembly-CSharp.dll]Game.State.StateManager.Awake:Before</StartingPoint>
    <MinimalManagerVersion>0.27.8</MinimalManagerVersion>
</GameInfo>
```

| Field | Meaning |
| --- | --- |
| `Name` (attribute) | Display name, and the key used everywhere else — `Params.xml`, the dropdown |
| `Folder` | Game folder name used for auto-detection |
| `ModsDirectory` | Mod folder relative to the game root, effectively always `Mods` |
| `ModInfo` | Mod manifest filename. Declared `Info.json`, but shipped mods use `info.json` — match case-insensitively |
| `GameExe` | Executable to look for when validating a folder |
| `EntryPoint` | Where the loader initialises |
| `StartingPoint` | Where mods start |
| `MinimalManagerVersion` | Oldest UMM that can run this game; also gates which Harmony payload is installed |
| `HarmonyVersion` | Optional; `2.2` selects the `Harmony/2.2` payload |

A game already present in the shipped list needs no supplemental file.

---

## Install types

UMM offers two, selected per game in the installer window and stored in `Params.xml`:

- **`DoorstopProxy`** (the default) — drops a Doorstop proxy DLL next to the executable and lets it
  load the manager before the game's own code runs. Pure file copies plus two generated text files;
  nothing the game shipped is modified, so it is fully reversible by deleting what was added.
- **`Assembly`** — patches the game's managed assemblies in place with dnlib, injecting calls at the
  declared `EntryPoint` and `StartingPoint`. It rewrites files the game shipped, so it is not
  something a mod manager should reproduce; reach it by running the bundled installer executable.

A Vortex extension can replicate DoorstopProxy as installer instructions and still ship
`UnityModManager.exe` as a registered tool, which keeps the Assembly type and UMM's own Mods tab
reachable for anyone who needs them.

---

## What a DoorstopProxy install actually writes

From `UnityModManagerApp/Form.cs`, `InstallDoorstop(Actions.Install)`. `managerPath` below is
`<Data>\Managed\UnityModManager`, where `<Data>` comes from `Utils.FindManagedFolder(gamePath)`.

| Destination | Source / content |
| --- | --- |
| `<gamePath>\winhttp.dll` | `winhttp_x64.dll` (x64 game) or `winhttp_x86.dll` |
| `<gamePath>\doorstop_config.ini` | generated — see below |
| `<gamePath>\<Data>\Managed\UnityModManager\` | `0Harmony.dll`, `dnlib.dll`, `UnityModManager.dll`, `UnityModManager.xml`, conditionally `System.Xml.dll` |
| `<gamePath>\<Data>\Managed\UnityModManager\Config.xml` | the game's own `<GameInfo>` block, re-serialised with `Config` as the root element |
| `<gamePath>\Mods\` | created empty |

`doorstop_config.ini`:

```ini
[General]
enabled = true
target_assembly = <Data>\Managed\UnityModManager\UnityModManager.dll
```

`target_assembly` is written relative to the game path.

### Library-set conditionals

The copied library set is not fixed. Three rules decide it, and all three matter for a general
implementation even when a single game resolves them to a constant answer:

- `System.Xml.dll` is **skipped when `<Data>\Managed\System.Xml.dll` already exists**. Shipping a
  second copy into the subfolder risks an assembly conflict.
- `Harmony/2.2/0Harmony.dll` is copied only when the game's `GameInfo` declares
  `HarmonyVersion == "2.2"`.
- `Harmony/1.2/*` is copied only when `MinimalManagerVersion` is below `0.22`.

### Installer self-protection guard

The installer refuses to run when its own directory is named exactly `UnityModManager` **and** a
parent within three levels is the game folder — a guard against installing over itself. The shipped
archive root is `UnityModManagerInstaller`, so deploying it to
`<gamePath>\UnityModManagerInstaller\` is safe and does not trip the guard.

---

## Installer state

### `Params.xml`

`%LOCALAPPDATA%\UnityModManagerNet\Params.xml`, schema in `Console/Config.cs`, class `Param`:

```xml
<Param>
    <LastSelectedGame>Railroader</LastSelectedGame>
    <UpdateCheckingMode>Auto</UpdateCheckingMode>
    <GameParams>
        <GameParam Name="Railroader">
            <Path>the game folder</Path>
            <InstallType>DoorstopProxy</InstallType>
            <LastUpdateCheck>0</LastUpdateCheck>
        </GameParam>
    </GameParams>
</Param>
```

`Param` also carries `WindowHeight` and `APIkey`. `InstallType` defaults to `DoorstopProxy`.
Pre-seeding a `GameParam` plus `LastSelectedGame` is what makes the executable open already pointed
at the right game and folder.

This file is shared by every UMM game on the machine, so anything writing it must **merge**: read,
upsert the one `GameParam`, write back. Clobbering it wipes the user's other games.

### Registry

`HKEY_CURRENT_USER\Software\UnityModManager`:

| Value | Content |
| --- | --- |
| `Path` | The installer folder |
| `ExePath` | Full path to `UnityModManager.exe` |

The executable writes these itself on first run when `ExePath` is missing or stale, so seeding them
is belt-and-braces rather than load-bearing.

---

## Mod format

A UMM mod is a folder under `<gamePath>\Mods\<Name>\` containing `info.json` and at least one
`.dll`. Archives are commonly **flat at the root with no wrapping folder**, so an installer usually
has to synthesise the folder name — from `info.json`'s `Id`, falling back to the archive name.

`info.json` follows `UnityModManager/ModInfo.cs`:

| Field | Notes |
| --- | --- |
| `Id` | Unique identifier; the conventional folder name |
| `DisplayName` | Shown in UMM's in-game UI |
| `Author`, `Version`, `HomePage`, `Repository` | Metadata |
| `ManagerVersion` | Minimum UMM version |
| `GameVersion` | Minimum game version |
| `Requirements[]` | Other mod IDs required |
| `LoadAfter[]` | Load-order hints |
| `AssemblyName` | DLL to load |
| `EntryMethod` | Method invoked on load |
| `ContentType` | Optional content classification |

The manifest name is declared as `Info.json` in `UnityModManagerConfig.xml` but shipped mods use
`info.json`. Match case-insensitively in both directions.

---

## Why the bundled helper extension is unusable

Vortex ships a `modtype-umm` extension (`extensions/modtype-umm/src/` in the Vortex repository).
It fails four independent ways, which is why an extension is better off handling UMM itself:

- `common.ts` carries a version table that stops at **0.24.2** and matches archives by exact
  `archiveName` string — dead on arrival after the Nexus file-naming change.
- `download()` rejects with `NotPremiumError` unless `persistent.nexus.userInfo.isPremium`.
- The non-premium fallback is a `browse-for-download` against `IDCs/unity-mod-manager`, a fork whose
  URLs no longer resolve.
- `index.ts` builds a `getPath` closure and then never passes it to `registerModType` — it passes
  `() => undefined`, so the `umm` mod type has no deploy path at all. UMM stays in staging and is
  only registered as a discovered tool.

---

## Notes for a Vortex extension

- **Install as a mod, deploy as files.** Reproducing DoorstopProxy as `copy` and `generatefile`
  instructions keeps everything UMM would have written under Vortex's deployment manifest, so a
  purge removes it cleanly — which a run of UMM's own installer would not.
- **Keep the installer folder too.** Copying `UnityModManagerInstaller/**` through verbatim
  alongside the patch files means `UnityModManager.exe` can still be registered as a tool.
- **Parse `UnityModManagerConfig.xml` out of the archive** to build `Config.xml` rather than
  hardcoding the `<GameInfo>` block. It keeps the logic general and survives upstream edits to the
  game's entry points.
- **Mark the install with a marker file.** `<Data>\Managed\UnityModManager\UnityModManager.dll` is
  the reliable "UMM is installed" check — it exists only after a DoorstopProxy install.
- **`winhttp.dll` is a claimed name.** Any other proxy loader for the same game wants the same file,
  so two Doorstop-style loaders cannot coexist without one of them being renamed.
- **Expect the first-activation ordering quirk.** UMM is fetched from the `site` domain, and Vortex
  installs site-hosted downloads into the game currently being managed. Because Vortex runs a game's
  `setup()` before that game becomes active, a first-run download can be installed into the
  previously active game instead; running it again with the game active behaves correctly. See
  `VORTEX_DOWNLOAD_MGMT.md`.
- **Retarget the tool at the deployed executable.** `modtype-umm` registers its UMM tool against the
  mod's *staging* folder, which is named after the version it installed
  (`.../UnityModManager-21-0-24-2/UnityModManager.exe`), so the entry dangles the moment that
  version is replaced. A game that previously used the helper extension still carries that stale
  entry in `settings.gameMode.discovered.<game>.tools`. Point any tool whose executable is
  `UnityModManager.exe` at `<gamePath>\UnityModManagerInstaller\UnityModManager.exe` instead - the
  deployed path is version-free - and resolve it from the game folder when launching rather than
  trusting the stored path.

---

## See also

`templates/TEMPLATE_UNITY_UMM.md` (the Vortex template built on this loader — its toggles, mod
types, and installer ladder).
`RAILLOADER.md` (the second loader used by Railroader, sharing the same `Mods` folder).
`TEMPLATES_OVERVIEW.md` (template selection, the shared extension anatomy, and the auto-download
route table this loader's Nexus route belongs to).
`DOWNLOADER.md` (the GitHub requirements module — explicitly *not* usable here, since UMM publishes
no GitHub releases).
`NEXUS_MODS_API.md` and `NEXUS_FILE_PROPERTIES.md` (`nexusGetModFiles`, `category_id`, and the file
naming convention that broke name matching).
`INSTALLER_SYSTEM.md` (`registerInstaller` test/install contracts and the `generatefile`
instruction used to write `doorstop_config.ini` and `Config.xml`).
`REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`VORTEX_DEPLOYMENT.md` (what deploying these files into the game folder does, and why purge
reversibility is the argument for reproducing the patch).
`WINAPI_BINDINGS.md` (writing the `HKEY_CURRENT_USER\Software\UnityModManager` values).
`FILE_PARSING.md` (`xml2js` `parseStringPromise` and `Builder`, used for both `Config.xml` and
`Params.xml`).
`RUN_EXECUTABLE.md` (`api.runExecutable`, for launching the bundled installer as a tool).
`BEPINEX.md` (the other UnityDoorstop consumer - the reason `winhttp.dll` plus
`doorstop_config.ini` does not identify a loader, and `target_assembly` has to be read).
`MELONLOADER.md` (the third general-purpose Unity loader, proxy-DLL based rather than
Doorstop-based).
