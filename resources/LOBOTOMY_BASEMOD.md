# Lobotomy BaseMod

BaseMod is the mod loader for *Lobotomy Corporation*. It ships inside the **Lobotomy Mod Manager**
(LMM), a standalone Unity application that both installs the loader and browses/downloads mods.
There is no separate "loader only" download.

What matters for a mod manager is that installing the loader is **nothing but file copies**. LMM
carries a prebuilt, already-patched copy of the game assembly in its release archive, so the
Patchwork/Cecil patch step it can perform is never required — copying the prebuilt result produces a
byte-identical install.

Verified against `LobotomyBaseMod/LMM` release `Update1.3.9` (published 2025-09-27), by reading the
shipped `LobotomyPatcher.exe` and the loader's own `Add_On` sources.

---

## The game

| | |
| --- | --- |
| Steam AppID | `568220` |
| Executable | `LobotomyCorp.exe` |
| Data folder | `LobotomyCorp_Data` |
| Nexus domain | `lobotomycorporation` |
| Stores | Steam only — LMM resolves the install directory through `SteamApps.GetAppInstallDir` and has no other lookup |
| Save data | `%USERPROFILE%\AppData\LocalLow\Project_Moon\Lobotomy` |
| Loader log | `…\LocalLow\Project_Moon\Lobotomy\LobotomyBaseMod\Log.txt` |

## Loader source

| | |
| --- | --- |
| Repository | `github.com/LobotomyBaseMod/LMM` |
| Release tags | `Update<version>` — e.g. `Update1.3.9` |
| Asset | `Lobotomy.Mod.Manager.<version>.zip` (~85 MB) |
| Sibling asset | `Updater.<version>.zip` — the self-updater, not wanted |
| Version | Reads off the **asset** name, so no tag-prefix stripping is needed |
| Nexus mirror | site mod 765 — same tool, but GitHub has been the update channel since LMM 1.2.0, so the build there trails the releases |

The version lives in the asset filename, so an archive-name pattern resolves it directly. Anchor
that pattern on the `.zip` extension and the `Lobotomy.Mod.Manager.` prefix, or the `Updater` asset
in the same release can be picked instead.

Only `LobotomyModManager_Data/PatchFiles/**` is wanted — about 16.5 MB of the 85 MB archive.
No leaner source exists: the repository's own `Assets/PatchFiles` carries neither the patched
assembly nor `Newtonsoft.Json.dll`, and the `Updater` asset is the same size as the full archive.

### Giving the Nexus page the download credit

Because the loader is installed from GitHub, the author's Nexus Mods page never registers a
download for it. The page lives on the **`site`** domain rather than the game's own, so its download
link is `nxm://site/mods/765/files/<fileId>`.

A tool that installs from GitHub can still credit the page by downloading the Nexus archive once and
never installing it. Three things make that safe to do:

- **Download only.** Pass `allowInstall: false`. The Nexus build trails the GitHub one, and
  installing both would put two copies of the same files in the mod list.
- **Once per user, tracked in settings.** A user can clear the Downloads tab, or reinstall the
  loader any number of times; neither should re-trigger the courtesy download. Recording it as a
  boolean in the extension's own settings is what makes "once" mean once. Checking whether the file
  is still on disk does not work — a download nothing installs is not retained.
- **Never gate it on whether the loader is missing.** A courtesy download nested inside the
  "loader not installed yet" branch never fires for the users most likely to have the loader
  already.

The credit counts at download time, so nothing further is needed for attribution.

### Satisfying the requirements health check

Many game mods list "Lobotomy Mod Manager" (`site` mod 765) as a Nexus requirement. Vortex's
built-in requirements health check only treats a requirement as met when a matching **enabled**
Nexus mod is installed — and the real loader is installed from GitHub under a different mod page,
so a fully working setup still shows "Missing required mod for: …".

Fix: alongside the credit download, register an **enabled placeholder mod** that carries the
Nexus identity and no files. `ensureNexusRequirementMod` in `game-lobotomycorporation/index.js`
builds it via the `create-mod` event with `state: 'installed'`, `type: ''`, an empty staging
folder, and `attributes` `{ source: 'nexus', modId: 765, downloadGame: 'site', fileId,
newestFileId, version, newestVersion }`. It deploys nothing (empty staging), but the requirement
match — a version-agnostic `(downloadGame, modId)` identity check — finds it. `fileId` is
stamped to the current Nexus file so the mod update check does not offer to "update" the
placeholder into the real archive. It is self-guarding: skipped once any mod with `modId` 765
exists (the placeholder, or a real manual Nexus install), and runs from `setup()` so it also
appears for users who installed before the placeholder existed.

See `HEALTH_CHECK.md` ("Built-in Nexus Mod Requirements check") for the matching rules this
relies on.

---

## The two patcher modes

`LobotomyPatcher.exe` can install the loader two ways, and both end at the same files:

- **Patch** — copy the vanilla `Assembly-CSharp.dll` out of the game, run Patchwork with
  `Lobotomypatch.dll` over it, and cache the result back into `PatchFiles` as
  `Assembly-CSharp_patched.dll`.
- **Paste** — copy the already-cached `Assembly-CSharp_patched.dll` straight over the game's
  `Assembly-CSharp.dll`.

The release archive ships `Assembly-CSharp_patched.dll` prebuilt, so **Paste is always available**,
and a mod manager only ever needs Paste. Nothing about the loader install requires Mono.Cecil,
Patchwork, or a runtime patch step.

## File map

Every destination is `LobotomyCorp_Data\Managed\`. Sources are relative to
`LobotomyModManager_Data\PatchFiles\` inside the release archive.

| Source | Destination | Notes |
| --- | --- | --- |
| `Assembly-CSharp_patched.dll` | `Assembly-CSharp.dll` | 4,329,472 bytes — **renamed on copy** |
| `Assembly-CSharp.dll` | `Assembly-CSharp.dll` | 4,121,088 bytes — the bundled *vanilla* copy. The patcher writes it first only so Paste has something to overwrite; deploying it is pointless and, for a mod manager, harmful |
| `Lobotomypatch.dll` | *not copied* | Patchwork's input, used only in Patch mode |
| `0Harmony.dll` | same name | |
| `LobotomyBaseModLib.dll` | same name | the loader library — the file to test an install against |
| `Newtonsoft.Json.dll` | same name | |
| `NAudio.dll` | same name | |
| `Facepunch.Steamworks.Win64.dll` | same name | |
| `steam_api64.dll` | same name | copied into `Managed\` even though the game's own copy lives at the game root — this is what the patcher does |
| `BaseMod\` (recursive, 591 files) | `Managed\BaseMod\` | base game data the loader reads |

`BaseMod\` holds `BaseList.txt`, `BaseCreatureGen.xml`, `BaseEquipment.txt`, `BaseIsolate.txt`,
`BaseMapGraph.txt`, `NewMap.xml`, `BackUp.dll`, and the `BaseCreatures\`, `StoryData\` and `Image\`
folders, each alongside its Unity `.meta` file.

### The loader library ships twice

`LobotomyBaseModLib.dll` appears at **two** paths in the release archive:

```text
LobotomyModManager_Data\Patcher\LobotomyBaseModLib.dll      <- beside Mono.Cecil + Patchwork
LobotomyModManager_Data\PatchFiles\LobotomyBaseModLib.dll   <- the copy that goes in the game
```

Anything that locates the payload by searching for that filename must anchor on the `PatchFiles`
parent folder. Taking the first match finds the `Patcher` folder, which yields the patcher's own
tooling (Mono.Cecil, Patchwork, Serilog, `LobotomyPatcher.exe`) instead of the loader.

---

## Mods

Mods live in `LobotomyCorp_Data\BaseMods\<ModFolder>\` — flat, one folder per mod, never nested.
Mod assemblies are loaded with `Assembly.LoadFile` per file in the mod folder root, so the files
have no internal references to one another and links (hard or symbolic) work fine.

### What makes a folder a mod

The loader's own ingest step (`ExtensionUtil.DoubleFolderChecking`) accepts a folder that holds
one of `Info\`, `Creature\`, `Equipment\`, `Localize\`, or a loose `.dll`. When a folder holds
exactly one subfolder, no files, and none of those marker names, it descends into it — that is how
a mod packed inside a wrapper folder still installs flat.

### Mod metadata

| File | Fields read |
| --- | --- |
| `Info\<lang>\info.xml` | `/info/name`, `/info/descs/desc`, `/info/ID` |
| `Info\GlobalInfo.xml` | `/info/ID`, repeated `/info/Require` (dependencies), `/info/Option` (Toggle / Slider settings) |

The loader probes languages in the order: the current language, then `en`, then `kr`.

---

## Load order and enabling

`LobotomyCorp_Data\BaseMods\BaseModList_v2.xml` is the only lever for enabling and ordering mods.

The in-game loader (`Add_On.init_patch`) walks the list **in order** and loads each named folder
when `Useit` is true. Folders in `BaseMods\` that the list does **not** name are loaded afterwards
and are always on. So the file is optional — a mod dropped in by hand still loads — but any tool
that wants to control order or disable a mod has to write it.

### Format

A plain `XmlSerializer` dump of `ModListXml { List<ModInfoXml> list }`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<ModListXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <list>
    <ModInfoXml>
      <modfoldername>SomeMod</modfoldername>
      <Useit>true</Useit>
      <IsWorkShop>false</IsWorkShop>
      <IsNexus>false</IsNexus>
      <IsGitHub>false</IsGitHub>
      <modid>-1</modid>
      <fileid>-1</fileid>
      <g_modid />
      <g_fileid>-1</g_fileid>
    </ModInfoXml>
  </list>
</ModListXml>
```

Rules worth knowing:

- Only `modfoldername` and `Useit` mean anything to the game. The `IsWorkShop` / `IsNexus` /
  `IsGitHub` / `modid` / `fileid` / `g_modid` / `g_fileid` fields are LMM's own update-check
  bookkeeping. Write them at the defaults above so LMM does not mistake an externally installed mod
  for one of its own managed downloads.
- **Booleans must be lowercase.** `XmlSerializer` will not read `True`.
- `XmlSerializer.Deserialize` tolerates missing elements (the field default applies) and ignores the
  `xmlns` declarations, so a minimal document parses fine. Writing the full shape is still the
  safer choice, because it is what LMM itself produces.
- Rebuild the document whole rather than merging into the existing one. LMM rewrites it wholesale
  too, and a merge preserves entries for folders that are gone.
- Mod folder names come off the filesystem, so escape them when writing.

### Naming mod folders

LMM names a mod's folder after the archive it came from. A mod manager that does the same keeps a
mod's `BaseModList_v2.xml` entry stable for a user who moves between the two tools.

---

## Not needed to support the loader

- The Patchwork run — the prebuilt patched assembly makes it redundant.
- LMM's session-cookie Nexus downloads, GitHub mod browser, comment and upload UI.
- The Steam Workshop directory scan (AppID `2531580`) — a separate distribution channel.
- `steam://run/568220` launching.

---

## See also

`DOWNLOADER.md` (the requirements auto-downloader that fetches the loader from its GitHub
release, including the archive-name version pattern this loader relies on).
`GITHUB_API.md` (the release and asset payload behind that fetch).
`VORTEX_LOAD_ORDER.md` (the file-based load order contract that `BaseModList_v2.xml` is wired to).
`VORTEX_MOD_INSTALL.md` (the installer contract used to flatten wrapper folders and name each mod's
folder after its archive).
`HEALTH_CHECK.md` (the built-in Nexus requirements check whose matching rules the enabled
placeholder mod above is built to satisfy).
`SIMPLE_MOD_FRAMEWORK.md` and `SNAKEBITE_CLI.md` (the two loaders in this collection that are *not*
file-copy installs, for contrast — both require the loader's own tooling to ingest a mod).
`UNITY_MOD_MANAGER.md` and `MELONLOADER.md` (the other Unity-side loaders documented here).
