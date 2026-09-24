# template-anvilengine

Ubisoft Anvil (Assassin's Creed, Ghost Recon). Game assets live inside packed `.forge` archives.
AnvilToolkit (ATK) unpacks, edits, and repacks them, so Vortex's job is to stage extracted content
where ATK expects it and then get out of the way — the mods are not live until the user runs ATK.

---

That repacking step is why **`allowSymlinks` defaults to `false` here**: ATK rewrites the files in
place, and a symlink would push the write back into the staging folder.

Everything a game needs to set lives in the **EDIT ZONE** at the top of `index.js` — game IDs
first, then the toggles, then the constants each toggle brings with it.

## Toggles

| Toggle                | Default | Adds                                                                                              |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `hasAtk`              | `true`  | ATK mod type, tool entry and download, plus the Extracted / `.forge` folder / `.data` folder / loose workflow and the rename dialog |
| `hasForger`           | `false` | Forger Patch Manager tool and `.forger2` patch mod type (older AC titles)                          |
| `hasReforger`         | `false` | ReForger tool entry, registry lookup and the installer's mod type/download plumbing               |
| `autoDownloadReforger` | `true`  | Runs the ReForger installer download during setup. `false`: tool + button still work, nothing happens unless the user clicks — for a game where both ReForger and legacy Forger are valid and only one should auto-install |
| `hasDlcFolders`       | `false` | DLC folder mod type and installer. `.forge` routing follows `DLC_FOLDERS` directly                |
| `hasResorep`          | `false` | ResoRep DLL mod type, textures mod type, auto-download and `dllsettings.ini` write                |
| `autoCopyResorepDll`  | `false` | Copies the system `d3d11.dll` into the game folder instead of leaving the bundled `.bat` to the user |
| `hasPatchTextures`    | `false` | Loose `.dds` textures as Forger patches — mutually exclusive with `hasResorep`                    |
| `hasSound`            | `false` | `.pck` sound bank mod type and installer                                                          |
| `hasFixes`            | `false` | Community fixes package mod type and installer                                                    |
| `hasBinariesType`     | `false` | A separate `-binaries` mod type alongside `-root`                                                 |
| `hasCustomLaunchers`  | `false` | Ubisoft Plus and Vulkan launcher tool entries                                                     |
| `hasSettingsIni`      | `false` | "Open Settings INI" toolbar button                                                                |
| `setupNotification`   | `false` | First-setup instruction notification                                                              |
| `deployNotification`  | `true`  | Post-deployment reminder, composed from whichever tools are enabled                               |
| `allowSymlinks`       | `false` | Feeds `details.supportsSymlinks`                                                                  |
| `fallbackInstaller`   | `true`  | Catch-all installer at priority 49                                                                |
| `debug`               | `false` | Debug logging                                                                                     |

`hasEpic` and `hasGog` are **derived**, not set by hand: each is true when its app-ID constant is
present in `DISCOVERY_IDS_ACTIVE`, and turns on `details.epicAppId` / `details.gogAppId` and the
matching `environment` entry.

Two startup asserts guard the combinations that silently half-work: `hasPatchTextures` together
with `hasResorep` (both claim `.dds`), and `hasDlcFolders` disagreeing with `DLC_FOLDERS` in either
direction.

## Mod types

| Mod type                                                                  | Gate               | Target                        |
| ------------------------------------------------------------------------- | ------------------ | ----------------------------- |
| `EXTRACTED_ID`, `FORGEFOLDER_ID`, `DATAFOLDER_ID`, `LOOSE_ID`, `FORGE_ID` | always             | `{gamePath}`                  |
| `ROOT_ID`                                                                 | always             | `{gamePath}`                  |
| `ATK_ID`                                                                  | `hasAtk`, low      | `{gamePath}`                  |
| `FORGER_ID`                                                               | `hasForger`, low   | `{gamePath}`                  |
| `FORGERPATCH_ID`                                                          | `hasForger`        | `{gamePath}\ForgerPatches`    |
| `PATCH_TEXTURES_ID`                                                       | `hasPatchTextures` | `{gamePath}\ForgerPatches`    |
| `DLC_ID`                                                                  | `hasDlcFolders`    | `{gamePath}`                  |
| `SOUND_ID`                                                                | `hasSound`         | `{gamePath}\sounddata\pc`     |
| `FIXES_ID`                                                                | `hasFixes`, low    | `{gamePath}`                  |
| `BINARIES_ID`                                                             | `hasBinariesType`  | `{gamePath}`                  |
| `RESOREP_TEXTURES_ID`                                                     | `hasResorep`       | `{gamePath}\ResoRep\modded`   |
| `RESOREP_ID`                                                              | `hasResorep`, low  | `{gamePath}`                  |

**Installers**, one ladder across 25-49: `ATK` 25 → `FORGER` 26 → `RESOREP` 27 → `FORGERPATCH` 28 →
`PATCH_TEXTURES` 29 → `RESOREP_TEXTURES` 30 → (31 left free for a game-specific installer) →
`SOUND` 32 → `FIXES` 33 → `DLC` 34 → `EXTRACTED` 35 → `FORGEFOLDER` 36 → `DATAFOLDER` 37 →
`LOOSE` 38 → `FORGE` 39 → `ROOT` 41 → fallback 49. The three at 39, 41 and 49 are registered
unconditionally; every other slot is behind its toggle. Forge **folder** deliberately sits ahead of
forge **file** so an unpacked folder is not claimed by the file installer.

**`LEGACY_MODTYPES`.** A retired mod type cannot simply be deleted: Vortex resolves a mod's
deployment target through its mod type, so a mod still carrying a de-registered type has no
resolvable path and its files strand, neither deployable nor purgeable. Retired types therefore
leave `spec.modTypes` but stay **registered** through this list, which no installer routes to. The
template ships it empty with a commented example; a game adds an entry when it retires a type, and
drops it only once no user can still be carrying a mod installed under it.

## The `.forge` rename dialog

A mod packaged as a loose `.data` folder does not say which `.forge` archive it belongs in, so
`installDataFolder` / `installLoose` stage it under the placeholder `RENAME_ME_TO_FORGE_NAME.forge`
and fire `renamingRequiredNotify`. `folderRenameDialog` takes a text input, appends `.forge` if the
user left it off, rejects the bare placeholder, then `rename()` purges deployment, renames the
folder inside staging, and redeploys. Renaming inside staging rather than the game folder is what
makes the change survive the next deploy.

## DLC folders and `.forge` routing

Enumerate the game's real `dlc_NN` folders into `DLC_FOLDERS` — off disk, never from memory — and
set `hasDlcFolders` to match. That one list drives three things: the DLC folder mod type and
installer, the `dlc_NN\Extracted` folders `setup` ensures are writable, and `.forge` routing.

Routing is **per file**, inside `installForge`: a `.forge` whose name carries a `_NN_dlc` segment
naming a declared folder gets that folder prefixed onto its destination path, and everything else
lands at the game root. One archive can therefore carry `.forge` files for several DLCs and each
one is routed on its own. There are no per-DLC mod types and no per-DLC file lists — every `.forge`
mod stays on the single root `.forge` type, and adding a DLC is a one-token edit to `DLC_FOLDERS`.

The match is anchored on `_NN_dlc` rather than a bare `_NN_` segment: identical on every known
filename, but it stops a root forge with an incidental number segment (`DataPC_boot_3_something.forge`)
from being pulled into `dlc_3`.

## ResoRep

ResoRep injects replacement textures at runtime through a `d3d11.dll` proxy, for the games ATK
cannot repack textures for. `BITS` (`BIT32` / `BIT64`) drives three things together: which Nexus
file variant is downloaded, which system folder the original DLL is copied from (`SysWOW64` vs
`System32`), and the suffix on the `application_to_hook` line.

The **Vortex** file variants on the ResoRep page deliberately ship no `dllsettings.ini` — the
extension writes it, substituting the game path and executable into the placeholder template, and
always points it at `{gamePath}\ResoRep\modded`. The two Manual variants bundle an ini of their own,
which is why the download pins explicit file IDs instead of resolving the newest main file.

With `autoCopyResorepDll` on, the extension copies the system DLL to `ori_d3d11.dll` in the **game
folder**, where it is live immediately but is not a managed mod file — purging or removing ResoRep
leaves it behind. With the toggle off, the user runs the `.bat` bundled with the ResoRep package,
which writes the same file into the mod's staging folder, where Vortex manages it. See
`../RESOREP.md`.

## Discovery, tools and actions

**Discovery:** Ubisoft Connect registry (`SOFTWARE\WOW6432Node\Ubisoft\Launcher\Installs\<UPLAYAPP_ID>`)
first, `GameStoreHelper` second.

**Tools:** Custom Launch, plus ATK, Forger, ReForger and the Ubisoft Plus / Vulkan launchers pushed
onto the array when their toggles are on. Assets `anvil.png`, `forger.png`, `reforger.png`,
`vulkan.png`. `deployNotify` builds its text and its buttons from whichever of those tools are
enabled, with `runDeployTool(api, toolId, toolName)` behind each button.

**ReForger** the app is not a Vortex mod, and despite the registry path it is NOT an MSIX/Windows
Store package either — `ReForgerInstaller.exe` does a regular application install that
self-registers under `...AppModel\PackageRepository\Packages\<prefix>_<version>_<suffix>`, a key
whose NAME embeds the installed version. `getReforgerPath()` never hardcodes that version: it
enumerates the parent key's subkeys and matches on the stable `REFORGER_PACKAGE_PREFIX`/`_SUFFIX`
parts, so it keeps resolving across every ReForger update with no maintenance.

Its installer IS handled as a mod, though — `ReForgerInstaller.exe` is a naked (non-archive)
GitHub release asset, fetched through the shared `downloader.js` module as a `directCopyAsMod`
requirement and deployed to `{gamePath}` via a synthetic `REFORGER_INSTALL_ID` mod type.
`downloadReforger()` calls the module's `download()` unconditionally (a non-forced call is always
safe — it only raises an "update available" notification, never overwriting anything on its own,
so nothing is lost by never gating it on whether ReForger already looks installed), then compares
the deployed mod's stamped version before and after: the installer is only actually RUN when that
version changed (a first-ever install counts) — both during setup and from a "Download ReForger"
button. Because the installer is now a managed mod, it gets real version tracking (mod list entry,
update notifications) that a plain fetch-and-run never had.

**Toolbar actions:** Open PCGamingWiki Page, Open SteamDB Page, View Changelog, Submit Bug Report,
Open Downloads Folder, plus Open Settings INI (`hasSettingsIni`), Force Copy System `d3d11.dll`
(`hasResorep`) and Download ReForger (`hasReforger`).

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../RESOREP.md` (the ResoRep package, its ini keys and the DLL proxy chain).
`../WINAPI_BINDINGS.md` (the Ubisoft Connect registry probe).
`../REQUIRES_LAUNCHER.md` (the Ubisoft Connect hand-off).
`../RUN_EXECUTABLE.md` (`runDeployTool`, behind the run-ATK button).
`../NOTIFICATIONS_DIALOGS.md` (the rename input dialog and the deploy notification).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
`../GITHUB_API.md` (the ReForger release lookup).
