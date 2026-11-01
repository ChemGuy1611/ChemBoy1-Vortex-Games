# User-Configurable Mod Paths

How to let the player choose where a mod type deploys, from a Vortex settings page, without
leaving deployed files behind when the folder changes. Worked examples: `game-railroader` (the
Railroader home folder, moved by the Steam launch option `-homedir`) and Vortex's bundled
`game-7daystodie` (the 7 Days to Die User Data Folder, `-UserDataFolder`).

---

## 1. When you need it

A mod type needs a configurable target when **both** are true:

- its folder is outside the game folder (usually under Documents or AppData), and
- the player can move that folder: a launch argument, a game setting, or a config file.

A hardcoded target then deploys to the default location while the game reads somewhere else.
Mods install and deploy without any error, but the game never loads them.

There is a second reason even when the game never moves the folder: Vortex can only use hardlinks
when the target and the staging folder are on the same drive. Documents is usually on `C:` (or
inside OneDrive), so a staging folder on another drive forces symlinks for that mod type, which
need the symlink privilege or Windows Developer Mode. If the game lets the folder move, a
user-chosen folder on the staging drive restores hardlinks.

---

## 2. The pieces

| Piece          | What                                                                                         | Railroader                                       |
| -------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Stored setting | `settings.<gameId>.<key>` via `registerReducer`; `""` means "use the default"                | `settings.railroader.homeDir`                    |
| Path helper    | Reads the setting, falls back to the default; used everywhere the path is needed             | `getHomeDir(api)`, `getNativeModPath(api)`       |
| Mod type       | `getPath` calls the helper, so every deploy reads the current value                          | Native Mod type                                  |
| Change function | The **only** code that writes the setting; purges the old target first                      | `changeHomeDir(api, newDir)`                     |
| Settings page  | `registerSettings` section with a folder picker; every button goes through the change function | Settings > Mods, "Railroader Home Folder"       |
| Detection      | Optional: read where the game is actually configured to look                                 | `detectSteamHomeDir()` (Steam launch options)    |
| Mismatch check | Optional: warn at setup when detection disagrees with the setting                            | `checkSteamHomeDir(api, discovery)`              |

Store `""` for the default rather than the default path itself. The default is usually built from
`util.getVortexPath("documents")`, which follows a redirected or OneDrive Documents folder; a
stored absolute path would not.

```js
const SET_HOME_DIR = `SET_${GAME_ID.toUpperCase()}_HOME_DIR`;
function setHomeDir(homeDir) {
  return { type: SET_HOME_DIR, payload: homeDir };
}
setHomeDir.toString = () => SET_HOME_DIR;

function getHomeDir(api) {
  const homeDir = api.getState()?.settings?.[GAME_ID]?.homeDir;
  return typeof homeDir === "string" && homeDir.length > 0 ? homeDir : HOME_DIR_DEFAULT;
}

// in applyGame / main
context.registerReducer(["settings", GAME_ID], {
  reducers: { [setHomeDir.toString()]: (state, payload) => ({ ...state, homeDir: payload }) },
  defaults: { homeDir: "" },
});
context.registerModType(
  NATIVE_MOD_ID,
  28,
  (gameId) => gameId === GAME_ID,
  (game) => pathPattern(context.api, game, getNativeModPath(context.api)),
  () => Promise.resolve(false),
  { name: NATIVE_MOD_NAME },
);
```

Write `getPath` as `(game) => pathPattern(context.api, game, <expression>)`: it reads the setting
at deploy time, and it is the shape the repo's static parser recognises for explicit mod types.
Folders that must exist go through `fs.ensureDirWritableAsync(getNativeModPath(api))` in `setup()`.

---

## 3. Changing the path safely

**Never just dispatch the new value.** An ordinary purge only looks in the mod type's *current*
target: the hardlink, symlink and move deployment methods all walk the current mod path (see
`NTFS_LINKS.md`). Vortex's manifest-driven fallback purge, which can clean an old location, only
runs when the deployment method itself is swapped. So after a plain path change, every file
deployed to the old folder stays there, unmanaged, and the game may keep loading it.

Purge the old target first with the `purge-mods-in-path` event. Vortex registers it with
`api.onAsync("purge-mods-in-path", (gameId, modType, modPath) => …)` in
`mod_management/index.ts`; pass `""` as `modType` for a game's default mod type.

```js
async function changeHomeDir(api, newDir) {
  let homeDir = trimPath(newDir);
  if (path.basename(homeDir).toLowerCase() === NATIVE_MODS_FOLDER.toLowerCase()) {
    homeDir = path.dirname(homeDir); // the Mods folder itself was picked
  }
  // ...validation, see section 4...
  const oldDir = getHomeDir(api);
  if (samePath(homeDir, oldDir)) {
    return false;
  }
  try {
    await fs.ensureDirWritableAsync(path.join(homeDir, NATIVE_MODS_FOLDER)); // new target usable?
    await api.emitAndAwait(
      "purge-mods-in-path",
      GAME_ID,
      NATIVE_MOD_ID,
      path.join(oldDir, NATIVE_MODS_FOLDER), // the OLD target
    );
    api.store.dispatch(setHomeDir(samePath(homeDir, HOME_DIR_DEFAULT) ? "" : homeDir));
    api.store.dispatch(actions.setDeploymentNecessary(GAME_ID, true));
  } catch (err) {
    api.showErrorNotification("Failed to change the home folder", err, { allowReport: false });
    return false;
  }
  return true;
}
```

Order matters:

1. **Check the new folder first** (`ensureDirWritableAsync`): if it is not writable, nothing has
   been purged or changed yet.
2. **Purge the old target** while the setting still points at it.
3. **Dispatch** the new value.
4. **`setDeploymentNecessary(gameId, true)`** — Vortex then prompts the deploy (or auto-deploys if
   the user has that on), the same as the 7 Days to Die extension does. Forcing a `deploy-mods`
   from the settings page also works but takes the choice away from the user.

If anything throws, the setting is unchanged.

---

## 4. Validating the pick

- **Strip the target sub-folder.** Players often pick the `Mods` folder itself instead of its
  parent; drop a trailing segment that matches the sub-folder name.
- **Refuse Vortex's own folders.** A target inside the game's staging folder
  (`selectors.installPathForGame`) or download folder (`selectors.downloadPathForGame`) would
  deploy mods into themselves. Show an error and leave the setting alone.
- **No-op when unchanged.** Compare normalised, case-insensitive paths with trailing separators
  removed; an unchanged pick must not purge anything.

```js
const trimPath = (folder) => path.normalize(folder).replace(/[\\/]+$/, "");
const samePath = (a, b) => trimPath(a).toLowerCase() === trimPath(b).toLowerCase();
const isInsidePath = (child, parent) => {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};
```

---

## 5. The settings page

`registerSettings(title, element, props, visible, priority)` — every argument is described in
`SETTINGS_REDUCER.md` section 5. For a game-specific folder picker:

```js
context.registerSettings(
  "Mods",
  HomeDirSettings,
  () => ({
    onBrowse: () => browseHomeDir(context.api).catch(showError),
    onDetect: () => applySteamHomeDir(context.api).catch(showError),
    onReset: () => changeHomeDir(context.api, HOME_DIR_DEFAULT),
  }),
  () => selectors.activeGameId(context.api.getState()) === GAME_ID,
  150,
);
```

The `visible` callback makes it a game-specific section, so in Vortex's modern layout it appears
on the "Game settings" page while the game is active.

The component, in plain JS (`React.createElement`), mirroring the 7 Days to Die layout: a read-only
path box with a browse button, plus extra buttons. It reads the setting with `useSelector`, so it
re-renders when the folder changes.

```js
function HomeDirSettings(props) {
  const { Icon, More } = require("vortex-api");
  const { Button, ControlLabel, FormControl, FormGroup, HelpBlock, InputGroup, Panel } =
    require("react-bootstrap");
  const { useSelector } = require("react-redux");
  const stored = useSelector((state) => state?.settings?.[GAME_ID]?.homeDir ?? "");
  const homeDir = stored.length > 0 ? stored : HOME_DIR_DEFAULT;
  const h = React.createElement;
  return h("form", { id: `${GAME_ID}-settings-form` },
    h(FormGroup, { controlId: `${GAME_ID}-homedir` },
      h(ControlLabel, null, "Home Folder", h(More, { id: `${GAME_ID}-homedir-more`, name: "Home Folder" }, "…help text…")),
      h(Panel, null,
        h(Panel.Body, null,
          h(InputGroup, null,
            h(FormControl, { className: "install-path-input", disabled: true, value: homeDir }),
            h(Button, { onClick: props.onBrowse, title: "Browse" }, h(Icon, { name: "browse" })),
          ),
          h(HelpBlock, null, stored.length > 0 ? "Launch option: …" : "Default folder"),
          h(Button, { onClick: props.onDetect }, "Use Steam's Folder"),
          " ",
          h(Button, { onClick: props.onReset, disabled: stored.length === 0 }, "Reset to Default"),
        ),
      ),
    ),
  );
}
```

The browse button uses `api.selectDir`, which resolves to the chosen folder or an empty value when
the dialog is cancelled:

```js
async function browseHomeDir(api) {
  const picked = await api.selectDir({ title: "Select the home folder", defaultPath: getHomeDir(api) });
  if (picked) {
    await changeHomeDir(api, picked);
  }
}
```

---

## 6. Reading Steam launch options

Steam stores each account's per-game launch options in
`<Steam>\userdata\<accountId>\config\localconfig.vdf`. Find the Steam folder through the game-store
helper; it works wherever Steam is installed:

```js
const steamPath = await util.GameStoreHelper.getGameStore("steam")?.getGameStorePath();
```

The file is KeyValues (VDF) text. The game's settings sit in a block keyed by its app id, under
`UserLocalConfigStore > Software > Valve > Steam > apps`:

```text
"1683150"
{
    "LastPlayed"        "1761843000"
    "cloud"
    {
        "quota"     "1"
    }
    "LaunchOptions"     "-homedir \"<folder with spaces>\""
}
```

Rules for reading it:

- **Values are escaped**: `\"` is a quote and `\\` a backslash. Unescape before parsing the
  argument (`value.replace(/\\(["\\])/g, "$1")`).
- **Find the right block**: match `"<appId>"` followed by `{`, walk to the matching `}` (skipping
  quoted strings, which may contain braces), then match `"LaunchOptions"\s+"((?:\\.|[^"\\])*)"`
  inside that block. The same app id can head other blocks; try each until one has
  `LaunchOptions`.
- **Several Steam accounts**: one `userdata` folder per account. Use the account whose
  `localconfig.vdf` was written most recently.
- **Three outcomes**: the argument's value; "no such argument" (the game uses its default); or
  "unknown" (Steam not found, file unreadable, no block for the game). Keep "unknown" distinct, so
  it never triggers a change or a warning.
- **Read only.** Steam keeps this file in memory and rewrites it while it runs, so edits are lost
  or corrupt the file. Tell the player the exact option to paste instead (Steam > game >
  Properties > General > Launch Options).
- Accept both `-arg "path with spaces"` and `-arg path`, and `-arg=path`, case-insensitively.

---

## 7. Launch path

The launch option only reaches the game if Steam starts it. An extension whose `requiresLauncher`
returns `{ launcher: "steam" }` for Steam installs has Vortex start the game through Steam, so the
player's launch options apply. A tool that runs the game's exe directly bypasses them. If a game
needs the argument on a direct launch, add it to that tool's `parameters` instead.

---

## 8. Mismatch check at setup

When detection disagrees with the stored setting, the player's mods are going somewhere the game
does not read. Check in `setup()` (without awaiting it, so a slow disk does not delay game
activation) and **notify — never move the folder on your own**, since moving purges deployed
files:

- skip it when the game was not discovered through Steam (`discovery.store` set and not `"steam"`);
- skip it when detection returns "unknown";
- otherwise compare the detected folder (or the default, for "no argument") with the setting, and
  on a difference show a warning whose action offers "Use Steam's folder" (runs the change
  function) or "Keep Vortex's folder".

---

## 9. Reference implementations

| | 7 Days to Die (Vortex bundled) | Railroader (`game-railroader`) |
| --- | --- | --- |
| Folder | User Data Folder; `Mods` inside it | Home folder; `Mods`, `Saves`, settings and logs inside it |
| Game reads it from | `-UserDataFolder="<path>"` | Steam launch option `-homedir "<path>"` |
| Setting | `settings.7daystodie.udf` | `settings.railroader.homeDir` (`""` = default) |
| How the argument reaches the game | Extension writes it into the game launcher's settings file | Player sets it in Steam; extension reads Steam's config, cannot write it |
| Change flow | `purge-mods-in-path`, set, `setDeploymentNecessary` | Same, plus a writable check on the new folder first |
| Source | `extensions/games/game-7daystodie/src/` (`Settings.tsx`, `util.ts`, `migrations.ts`) | `game-railroader/index.js` (home folder section) |

---

## 10. Testing

Automated, with the template harness (`tests/harness/load-extension.js`; expose the internal
functions through a source transform):

- the mod type's `getPath` returns the default path with empty state, and `<folder>\Mods` with
  `settings.<gameId>.homeDir` set;
- the reducer is registered at `["settings", GAME_ID]` with the `""` default;
- the change function emits `purge-mods-in-path` with the **old** path **before** dispatching the
  new value, then dispatches `setDeploymentNecessary`;
- picking `<folder>\Mods` stores `<folder>`; an unchanged pick emits nothing; a folder inside the
  staging folder is refused;
- the VDF reader on fixture text: quoted path with spaces, unquoted, `-arg=path`, other options
  around it, no `LaunchOptions`, wrong app id, trailing backslash.

Live, in Vortex:

1. Deploy some mods to the default folder.
2. Pick a new folder in the settings page: the old folder loses every Vortex-deployed file and its
   `vortex.deployment.*.json` manifest; after deploying, the mods are in the new folder (hardlinks
   when it is on the staging drive).
3. Set the launch option in Steam: "Use Steam's Folder" picks it up; restarting Vortex with a
   different setting shows the mismatch warning.
4. "Reset to Default" moves everything back.
5. Start the game through Vortex (via Steam) and confirm it loads the mods.

---

## See also

`SETTINGS_REDUCER.md` (`registerReducer` and every `registerSettings` argument).
`VORTEX_DEPLOYMENT.md` (deployment, purge and the manifest).
`NTFS_LINKS.md` (why a purge only sees the current target; hardlinks and drives).
`EVENTS.md` (`purge-mods-in-path`). `DEPLOYMENT_MANIFEST.md` (the per-mod-type manifest left in
the target folder). `REQUIRES_LAUNCHER.md` (starting the game through Steam).
`RAILLOADER.md` (Railroader's home folder and native mods).
