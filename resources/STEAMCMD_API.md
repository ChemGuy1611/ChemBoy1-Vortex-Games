# SteamCMD API (steamcmd.net)

Steam's per-app product info (the "appinfo" that the Steam client and `steamcmd +app_info_print`
read) holds the launch executables, the install folder name and the Steam Cloud save paths of every
app. Those three answer most of the questions a new extension has to settle: `EXEC`, the
Unreal project folder (`EPIC_CODE_NAME`), and where saves and config live. The Steam Store
`appdetails` endpoint does not return any of it, and steamdb.info, which renders the same data on its
`/info/` and `/config/` pages, answers scripted requests with `403 Forbidden`.

steamcmd.net mirrors that appinfo as JSON. It is a free, open-source community service: no key, no
authentication, no stated rate limit, and records update within seconds of Steam publishing a change.

| Surface  | URL                                     | Returns                     |
| -------- | --------------------------------------- | --------------------------- |
| App info | `https://api.steamcmd.net/v1/info/{id}` | Full appinfo for one app ID |
| Version  | `https://api.steamcmd.net/v1/version`   | Service version (`major`, `minor`, `patch`) |
| Health   | `https://api.steamcmd.net/health`       | `{"status": "healthy", ...}` liveness probe |

`{id}` is the Steam App ID (`STEAMAPP_ID`). Optional query parameter `pretty=1` indents the output.
`/v1/` is the only API version; the full route list is at `https://api.steamcmd.net/openapi.json`.
There is no batch lookup: `{id}` must be one integer, and a comma-separated list returns `422`, so
fetch one app per request.

---

## Response shape

```json
{
  "data": {
    "4115450": {
      "common": { "name": "Phantom Blade Zero", "type": "Game", "oslist": "windows" },
      "config": {
        "installdir": "PBZ",
        "launch": {
          "0": {
            "executable": "steam\\PBZ.exe",
            "type": "default",
            "config": { "oslist": "windows", "osarch": "64" }
          }
        },
        "steaminputmanifestpath": "ProjectPBZ/SteamInput/steam_input_manifest.vdf"
      },
      "depots": { "branches": { "public": { "buildid": "26266538" } } },
      "extended": { "developer": "S-GAME Studio", "publisher": "S-GAME Publishing" },
      "ufs": {
        "savefiles": {
          "0": {
            "root": "gameinstall",
            "path": "ProjectPBZ/Saved/SaveGames/Steam/{64BitSteamID}",
            "pattern": "*.sav",
            "platforms": { "1": "Windows" }
          }
        }
      }
    }
  },
  "status": "success"
}
```

Every "array" in appinfo is an object keyed `"0"`, `"1"`, … — iterate `.values()`, never index
numerically. All values are strings, including numbers and booleans (`"1"`).

An unknown or unpublished app ID still returns `200` with `"status": "success"` and an empty object
(`{"data": {"1": {}}}`), so test for the keys you need rather than the status. A non-integer ID
returns `422` with a validation error body.

Each record also carries mirror metadata next to the appinfo sections: `appid`, `_change_number`
(Steam's PICS change number, which rises with every edit), `_sha`, `_size` and `_missing_token`.
`_missing_token: true` alone is common and harmless. When Steam hides the app behind an access
token, the record holds only `common` plus `"public_only": "1"`, with no `config`, `ufs` or
`depots`: no launch entries and no cloud paths to read. 2 of 288 repo games returned that
(Car Mechanic Simulator 2027 and Warhammer 40,000: Dark Heresy). Treat it as "not available yet",
not as "this game has no cloud saves".

---

## Fields and the extension constants they feed

| Field | Feeds | Notes |
| ----- | ----- | ----- |
| `config.launch.*.executable` | `EXEC` | Path relative to the install root, backslash-separated, sometimes with a leading `\`. Skip entries whose `config.oslist` is not `windows`, and rank the rest as described under [Launch entries](#launch-entries). Can sit in a subfolder (`steam\PBZ.exe`), so build `EXEC` with `path.join` |
| `config.launch.*.executable` containing `<X>/Binaries/` | `EPIC_CODE_NAME` = `<X>` | Only present when Steam launches the shipping exe directly instead of the root bootstrap exe. Read beta-branch entries too: Silent Hill 2 shows `SHProto\Binaries\Win64` only on its dev branch |
| `ufs.savefiles.*.root` | Save location (`SAVEMOD_LOCATION`) | See the root table below |
| `ufs.savefiles.*.path`, segment before `Saved` | `EPIC_CODE_NAME` when root is `gameinstall`; `DATA_FOLDER` when root is `WinAppDataLocal` | Skip a store folder (`Steam`) directly before `Saved`; a `WinAppDataLocal` path may carry a company prefix (`11bitstudios/Frostpunk2`), which belongs in `DATA_FOLDER` |
| `ufs.savefiles.*.path`, folder after `SaveGames` | Per-store save subfolder | A literal `Steam` here means the save path has a store layer before the user-ID folder |
| `ufs.savefiles.*.pattern`, `recursive` | Reference only | File glob Steam syncs (`*.sav`); `recursive: "1"` includes subfolders, so the save files can sit below the listed path |
| `ufs.rootoverrides.*` | Save location | Rewrites a root per OS (`useinstead`, `addpath`, `pathtransforms`); apply the Windows override before reading the root, see below |
| `config.installdir` | Nothing directly | Folder name under `steamapps/common`. Not the Unreal project name, see accuracy below |
| `config.steaminputmanifestpath` | `EPIC_CODE_NAME` (rare) | Occasionally starts with the project folder |
| `depots.branches.public.buildid` | Reference only | Same value the installed `appmanifest_<id>.acf` carries, see `GAME_VERSION_RESOLUTION.md` |
| `common.releasestate`, `common.steam_release_date` | Reference only | `released` or `prerelease`; release date as a Unix timestamp. A `prerelease` app may still lack launch and cloud entries |
| `extended.listofdlc`, `extended.developer`, `extended.publisher` | Reference only | Comma-separated DLC app IDs. `common.associations` lists the same developer and publisher as `{name, type}` pairs |

A store folder in either position (`Bloodlines2/Steam/Saved`, `SaveGames/Steam/<id>`) means the
extension needs a per-store path. When Steam, Epic and GOG share one exe name, the exe can't tell the
stores apart; read the store from Vortex's discovery instead: `setup()` stores `discovery.store` and
a `STORE_FOLDERS` map (`{ steam: "Steam", gog: "GOG", ... }`) picks the folder, as
`game-frostpunk2` and `game-vtmbloodlines2` do. Guessing from which folder exists picks the wrong
one when a player has run the game from two stores.

### Launch entries

Across the 288 repo games with a Steam App ID, more than half of the ~1,000 launch entries carry
`config.betakey`: they appear only when that beta branch is selected, and most branches are private
developer, QA or partner builds (`ArkansasDev.exe` for The Outer Worlds 2, `profile\Game_x64_prof.exe`
for Control Resonant, `NIP.WinGameSteam.Submission.DX12.exe` for Horizon Forbidden West). 117 of
them are also marked `type: "default"`, so "first default entry" alone picks a dev build. Rank the
entries instead:

1. Public branch first: no `betakey`, or a `betakey` list (comma- or space-separated) that includes
   `public`.
2. Then entries without `config.ownsdlc` (shown only to owners of that DLC app ID).
3. Then `type: "default"` before `option1`, `option2`, `none` and the rest. `none` is an ordinary
   launch entry (Resident Evil 2's only one is `type: "none"`), not a disabled one.

Don't drop branch entries. For 9 repo games every Windows entry is branch-tagged (Nioh 3, Marvel's
Spider-Man 2, Ninja Gaiden 4 among them), and a branch entry can still carry the only
`<X>/Binaries/` path. Ranking instead of the old "first default entry"
rule changed the picked exe for 6 repo games, all toward the exe the extension already uses, and
made no pick worse.

`config.osarch` (`"64"`, rarely `"32"`) and `type` values `editor`, `vr` and `manual` also occur;
they are rare enough that the ranking above handles them.

### Steam Cloud roots

| `root` | Location on Windows | Repo constant |
| ------ | ------------------- | ------------- |
| `gameinstall` | Game install folder | Game folder (discovery path) |
| `WinAppDataLocal` | `%LOCALAPPDATA%` | `LOCALAPPDATA` |
| `WinAppDataLocalLow` | `%USERPROFILE%\AppData\LocalLow` | `LOCALLOW` |
| `WinAppDataRoaming` | `%APPDATA%` | `ROAMINGAPPDATA` |
| `WinMyDocuments` | Documents | `DOCUMENTS` |
| `WinSavedGames` | `%USERPROFILE%\Saved Games` | — |
| `WindowsHome` | `%USERPROFILE%` | — |

`MacAppSupport`, `MacDocuments`, `LinuxHome`, `LinuxXdgDataHome` and other non-Windows roots
usually belong to other platforms' entries (check `platforms`). Apply `rootoverrides` before you
discard them. An override with `os: "Windows"` can map a non-Windows root onto a Windows one:
Farming Simulator 25 lists every save entry under `MacAppSupport`, and its Windows override
(`useinstead: "WinMyDocuments"`, `addpath: "My Games/"`) turns them into
`Documents\My Games\FarmingSimulator2025`. Cronos: The New Dawn and Vein do the same with
`pathtransforms` (find `.config/Epic/Vein/Saved/SaveGames`, replace `Vein/Saved/SaveGames`), which
lands on the `WinAppDataLocal` entry they also list directly. Compare `os` case-insensitively: most
overrides say `Windows`/`MacOS`/`Linux`, but lowercase `macos` and `linux` also occur. Every
override across the 288 repo games used `oscompare: "="`.

Steam Cloud syncs from the exact path declared here, so a wrong root would break cloud saves for the
whole player base — in practice a single root is reliable. **Several roots tell you nothing on
their own:** a dozen Unreal games list the same `Saved/SaveGames` path under both `gameinstall` and
`WinAppDataLocal`, because Steam syncs every listed root, and PCGamingWiki puts those it covers
(Hell Is Us, Subnautica 2, Return to Moria, Boltgun, Bloodlines 2) in Local AppData. Treat a mixed
list as a question for PCGamingWiki or a real install, and prefer its store-specific rows over the
generic Windows row: for Bloodlines 2 the generic row says the game folder, while the Steam and GOG
rows say `%LOCALAPPDATA%\Bloodlines2\Steam` and `...\GOG` — matching the cloud's Local AppData
entry, store folder included. The folder names under a root are less reliable still: Of Ash
and Steel's cloud entry says `ofAshAndSteel` while the game writes `ofAshAndSteelGame`, and HumanitZ
still lists entries for an older `TSSGame` folder next to the current `HumanitZ` one. Read every
`savefiles` entry, and confirm a folder name against PCGamingWiki or a real install before relying
on it. PCGamingWiki confirmed the `gameinstall` root
for Lies of P and Black Myth: Wukong, both Unreal games whose saves sit inside the game folder rather
than the usual `%LOCALAPPDATA%\<Project>\Saved`.

---

## Accuracy for Unreal project names

Measured against the 95 Steam-listed `template-ue4-5` extensions whose `EPIC_CODE_NAME` was set by
hand:

| Source | Present | Matches when present |
| ------ | ------- | -------------------- |
| `<X>/Binaries/` in a launch path | 10 | 100% |
| `gameinstall` save path, segment before `Saved` | 17 | 100% |
| Any save path, segment before `Saved` | 74 | 84% |
| Launch exe file name without `.exe` | 95 | 69% |
| `installdir` | 95 | 35% |

Chained in that order (Binaries → save path → exe stem → `installdir`) the result matches 76 of 95.
The launch executable matched the hand-set `EXEC` for 85 of 95 under the old "first default entry"
rule, and 86 with the public-branch ranking from [Launch entries](#launch-entries) (The Outer Worlds
2 moved from `ArkansasDev.exe` to `TheOuterWorlds2.exe`). The code-name figures are unchanged.

What the misses look like:

- **Launcher or anti-cheat bootstrap as the launch exe** — `start_protected_game.exe` (Easy
  Anti-Cheat), `*_Launcher.exe`, `GameBootstrapper.exe`, `Launcher.exe`. Correct as `EXEC`, useless as
  a code-name hint.
- **Internal code names** — The Outer Worlds is `Indiana`, Avowed `Alabama`, Tekken 8 `Polaris`. No
  appinfo field carries them unless a launch path or `gameinstall` save path does.
- **Local AppData folder differs from the project folder** — the save path is then the right value
  for `DATA_FOLDER`, not for `EPIC_CODE_NAME`.

---

## Use in This Repo

`vortex_utils.py` wraps it: `fetch_steam_appinfo(appid)` returns the app record (or `{}`) and
writes fetch errors and token-restricted notices to stderr, `steam_launch_exes()` the Windows
launch paths ranked public branch first, and `steam_cloud_saves()` the Windows cloud save
entries with `rootoverrides` applied. `new_extension.py` uses them to fill `EXEC` and
`EPIC_CODE_NAME` (in the precision order above, skipping launcher exes) and to leave the cloud save
paths as review comments on `SAVEMOD_LOCATION` and, for `template-ue4-5`, `DATA_FOLDER`.
`audit_steam_appinfo.py` runs the same inference backwards over existing `template-ue4-5`
extensions and reports where their `EPIC_CODE_NAME`, `EXEC`, `DATA_FOLDER` or save location
disagree with Steam, split into "likely wrong" (sources that never missed) and "verify".

Query by hand:

```sh
curl -s "https://api.steamcmd.net/v1/info/4115450?pretty=1"
```

Worked example — Phantom Blade Zero (`4115450`): `installdir` is `PBZ` and the launch exe is
`steam\PBZ.exe`, neither of which names the project. The `gameinstall` save path
`ProjectPBZ/Saved/SaveGames/Steam/{64BitSteamID}` gives `EPIC_CODE_NAME = "ProjectPBZ"`, shows the
saves live in the game folder rather than Local AppData, and shows a `Steam` store folder between
`SaveGames` and the user-ID folder. `steaminputmanifestpath` agrees on `ProjectPBZ`.

---

## Caveats

- **Steam only.** Epic and GOG installs can use a different exe path or save layout. egdata.app
  covers Epic (`FolderName` is the install folder, not the project name); gogdb.org covers GOG.
- **Pre-release apps** carry whatever the developer has published so far. A launch entry or cloud
  config may be missing until release week. `common.releasestate: "prerelease"` flags them, and a
  token-restricted record (`public_only`, see [Response shape](#response-shape)) holds nothing but
  `common`.
- **Beta-branch launch entries** are the norm, not the exception. Rank them last (see
  [Launch entries](#launch-entries)) or a private dev exe ends up as `EXEC`.
- **Community-hosted.** If the service is down, steamdb.info's `/info/` and `/config/` pages show the
  same fields in a browser.

---

## See also

`PCGAMINGWIKI_API.md` (save and config paths when the wiki has them; cross-check against the cloud
root here). `MICROSOFT_STORE_CATALOG_API.md` (the equivalent lookup for Xbox identity constants).
`STEAMCHARTS_API.md` (name-to-AppID search and player history for the same AppID).
`GAME_VERSION_RESOLUTION.md` (where the installed `buildid` is read at runtime).
`TEMPLATES_OVERVIEW.md` (`template-ue4-5`'s `EPIC_CODE_NAME`, `EXEC`, `DATA_FOLDER` and save
constants these fields fill).
