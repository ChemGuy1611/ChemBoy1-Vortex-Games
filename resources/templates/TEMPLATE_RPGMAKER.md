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

| Mod type | Priority | Target |
| --- | --- | --- |
| `JSFOLDER_ID` | spec | `{gamePath}` |
| `JSFILE_ID` | spec | `js/plugins` |
| `ROOT_ID` | spec | `{gamePath}` |
| `JSON_ID` | spec | `data` |
| `CONFIG_ID`, `SAVE_ID` | 60 each | absolute paths |

**Installers:** `JSFOLDER` 25 → `JSFILE` 27 → `ROOT` 29 → `JSON` 31 → fallback 49.

**`plugins.js` auto-registration.** Both JS installers do the same thing after building their copy
instructions: walk the staging folder recursively for `.js` files, map them to plugin base names,
read `js/plugins.js`, slice the text between the first `[` and the first `;` to recover the JSON
array, append one `JSLIST_TEMPLATE` entry per plugin not already listed (with `modNamePattern`
substituting `{modName}`), and write the file back as `var $plugins =\n<json>;`. Failures are logged
at `error` level and swallowed, not thrown — a mod still installs if the list write fails, and the
user is told to edit it by hand.

**`setupNotification` defaults to `true`** for exactly that reason: the auto-registration handles
presence, not ordering or parameters, so the reminder to check `plugins.js` manually is always
relevant. Extra toolbar action: Open plugins.js File.

---

## See also

`../TEMPLATES_OVERVIEW.md` (template selection, shared anatomy, universal toggles — read first).
`../FILE_PARSING.md` (reading and rewriting `plugins.js`).
`../FILE_SEARCH.md` (the recursive staging-folder walk behind auto-registration).
`../REGISTER_GAME.md` (the `spec` / `applyGame()` contract).
`../INSTALLER_SYSTEM.md` (`registerInstaller` semantics behind the ladder above).
`../FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return in every `testSupported`).
