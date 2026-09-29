# template-rpgmaker

RPG Maker MV and MZ. Plugins are `.js` files in `js/plugins`, but the engine only executes what is
listed in `js/plugins.js` — dropping the file in does nothing on its own. The template's defining
feature is writing that list for the user.

---

**Constants:** `JSFILE_PATH` `js/plugins`, `JSFOLDER_PATH` `.` with `JSFOLDER_FILE` `js`,
`JSLIST_FILE_PATH` `js/plugins.js`, `JSON_PATH` `data`, `ROOT_FOLDERS`
`[<NAME_FOLDER>, 'audio', 'css', 'data', 'effects', 'fonts', 'icon', 'img', 'lib', 'locales', 'swiftshader']`,
`JSLIST_HEADER` `var $plugins =\n`, and `JSLIST_TEMPLATE`:

```json
{
    "name": "{modName}",
    "status": true,
    "description": "Mod installed with Vortex. See mod page for descripton. You may need to add additional parameters below.",
    "parameters": {}
}
```

| Mod type               | Priority | Target         |
| ---------------------- | -------- | -------------- |
| `JSFOLDER_ID`          | spec     | `{gamePath}`   |
| `JSFILE_ID`            | spec     | `js/plugins`   |
| `ROOT_ID`              | spec     | `{gamePath}`   |
| `JSON_ID`              | spec     | `data`         |
| `CONFIG_ID`, `SAVE_ID` | 60 each  | absolute paths |

**Installers:** `JSFOLDER` 25 → `JSFILE` 27 → `ROOT` 29 → `JSON` 31 → fallback 49.

**`plugins.js` load order (FBLO).** The JS installers only copy files and stamp a `pluginNames`
attribute (`LO_ATTRIBUTE`) listing the plugin basenames the mod installed — they no longer touch
`plugins.js` at install time. `context.registerLoadOrder` owns the file instead:

- `deserializeLoadOrder` reads `plugins.js`'s own array (freshest, catches hand edits),
  falls back to a per-profile sidecar (`<profileId>_pluginsLoadOrder.json`, game root, durable
  across a `plugins.js` reset), then defaults for a plugin never seen before. Only entries whose
  basename resolves to a `modId` via `LO_ATTRIBUTE` are shown — vanilla/base-game plugins never
  appear on the page.
- `serializeLoadOrder` re-reads `plugins.js` fresh, writes the reordered/toggled managed entries
  back plus an untouched passthrough of any still-deployed entry the page doesn't manage (keeps
  vanilla plugins in the file without ever showing them), and mirrors the managed entries to the
  sidecar.
- A module-level `isPurging` guard (armed on `will-purge`, cleared + self-resynced on `did-deploy`)
  skips both functions during a purge — every plugin `.js` file is transiently gone mid-purge, and
  without the guard that reads as a mass-uninstall and wipes `plugins.js`.
- A `customItemRenderer` (mod thumbnails, position locking, status filter pills, right-click menu —
  move to top/bottom, open staging folder/mod page, enable/disable) is wired into the same
  `registerLoadOrder` call, ported from `game-warhammer40kdarktide`'s FBLO row pattern. No "Open Mod
  Folder" item: `LO_ATTRIBUTE` is array-valued (one mod can install several plugin files), so a
  plugin entry has no single per-entry folder the way a mod folder does on darktide.

Reading/writing the array itself still slices the file's text between the first `[` and the
**last** `;` (not the first — a `description`/`parameters` string can contain its own semicolon
before the array's real closing one).

**`setupNotification` defaults to `true`**: the Load Order page handles presence/ordering/enable,
but a plugin's `parameters` often still need filling in by hand, so the reminder stays relevant.
Extra toolbar action: Open plugins.js File.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../FILE_PARSING.md` (reading and rewriting `plugins.js`).
`../FILE_SEARCH.md` (the recursive staging-folder walk behind plugin file installs).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
`../LOAD_ORDER_REGISTRATION.md` (`registerLoadOrder` contract behind the plugins.js FBLO).
`../LOAD_ORDER_ITEM_RENDERER.md` (the `customItemRenderer`/context-menu pattern this template's row renderer ports).
`../NON_UE_LOAD_ORDER_PAGES.md` (tier G catalog — this template's third skin of the darktide/kcd2 block, and the file-granularity delta from array-valued `LO_ATTRIBUTE`).
