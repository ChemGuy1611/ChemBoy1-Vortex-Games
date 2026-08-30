# Helldivers 2 Mod Manifest

`manifest.json` is the community standard that lets a Helldivers 2 mod describe the choices it
offers — named options, sub-options, descriptions, thumbnails, categories — instead of leaving a
mod manager to guess from folder names. It predates Vortex support for the game: two third-party
managers defined it, and mod authors have been shipping it for years.

Three versions exist, and a file's version is decided by one property:

| Version | How it is recognised | Who defined it |
| --- | --- | --- |
| Legacy | no numeric `Version` property | `teutinsa/HD2ModManager` (WPF, superseded) |
| V1 | `"Version": 1` | `teutinsa/Helldivers2ModManager` |
| V2 | `"Version": 2` | HD2 Arsenal (`rsnl.gg`) |

`Helldivers2ModManager` treats `Version: 2` as end-of-life and refuses it; Arsenal owns that
version. A manager that supports all three — as the Vortex extension does — reads the version
number and nothing else to decide which parser to run.

The file always sits at the **root of the mod archive**, alongside the option folders it names.

---

## Shapes

### Legacy

```jsonc
{
  "Guid": "…",
  "Name": "…",
  "Description": "…",
  "IconPath": null,
  "Options": ["Folder A", "Folder B"]   // folder names; EXACTLY ONE is installed
}
```

`Options` is a flat list of folder names relative to the archive root. It is a radio list: the user
picks one folder and that folder's patch files are the mod.

### V1

`Options` become objects, and a second level appears.

```jsonc
{
  "Version": 1,
  "Guid": "…",
  "Name": "…",
  "Description": "…",
  "IconPath": null,
  "Options": [{
    "Name": "…",
    "Description": "…",
    "Image": "rel/path.png",          // relative to the archive root
    "Include": ["dir", "…"],          // taken whenever the option is enabled
    "SubOptions": [{
      "Name": "…", "Description": "…", "Image": "…",
      "Include": ["dir", "…"]         // EXACTLY ONE sub-option is installed per enabled option
    }]
  }],
  "NexusData": { "ModId": 123, "Version": "1.0" }
}
```

### V2

V1 plus grouping and identity:

- `Options[].Guid` — a stable id for the option.
- `Options[].CategoryRef` — the `Guid` of a category.
- `Categories: [{ "Guid": …, "Name": …, "Description": … }]`.
- `Tags: ["…"]`.
- `NexusData: { "ModId": 123 }` — no `Version` field.

---

## Selection semantics

This is the part that is easy to get wrong, because the two levels behave differently. The rules
below are the ones the reference managers implement:

| Version | `Options` | `SubOptions` |
| --- | --- | --- |
| Legacy | exactly one, a radio list | n/a |
| V1 / V2 | any number, independent checkboxes | exactly one per enabled option, a radio list |

Two further rules matter as much as the table:

- **`Options` absent or empty means there is no question.** The mod is installed from the archive
  root and the manifest is only carrying its name and description.
- **`Include` folders are read without recursion.** An `Include` entry names a folder that
  *directly* contains patch files. Files in a subfolder of an included folder are not installed.
  Authors who nest their patch files one level deeper than the folder they list end up shipping a
  mod that installs nothing.

Patch file names themselves follow the game's own convention — a 16-character lowercase archive
hash, a patch index, and an optional `.gpu_resources` or `.stream` sidecar:

```text
<hash>.patch_0
<hash>.patch_0.gpu_resources
<hash>.patch_0.stream
```

A patch file and its sidecars are one unit. Nothing may separate them, and nothing may renumber one
without the others.

---

## Numbering across enabled options

Because V1/V2 allow several options at once, two enabled options can both contribute files for the
same archive hash — and both will call their file `<hash>.patch_0`. That is legitimate and expected:
a manager is required to renumber them into a contiguous sequence per archive rather than treating
the collision as an error.

```text
option A folder:  aaa….patch_0 (+ .stream)   ->  aaa….patch_0 (+ .stream)
option B folder:  aaa….patch_0, aaa….patch_1 ->  aaa….patch_1, aaa….patch_2
option B folder:  bbb….patch_0               ->  bbb….patch_0
```

The consequence for mod authors: **hand-numbering across option folders does not control priority.**
Numbers are assigned by the manager, in option order, and the only ordering an author can rely on is
the relative order of patch indices *inside a single folder* — that ordering is preserved.

---

## What the Vortex extension does with it

`game-helldivers2` reads `manifest.json` at install time and normalises Legacy, V1, V2 and the
plain-folder case into one internal option tree, so the same picker and the same install path serve
all four.

- The manifest is read from the installer's extraction directory — see `INSTALLER_SYSTEM.md` for why
  an installer can read file *contents* and not just names.
- **A manifest is never allowed to fail an install.** Missing, truncated, malformed, or listing
  options that resolve to nothing: each of those is logged as a warning and the extension falls back
  to inferring options from the archive's folder layout. The mod still installs.
- Validation is warn-only and covers the cases the reference managers reject: options that are not
  objects, sub-option lists that yield nothing usable, an `Include` naming a folder the archive does
  not contain, and a `CategoryRef` with no matching category.
- `manifest.json` and every image it references are kept out of the installed files. They are
  artwork for the picker; deploying them would put loose files in the game's `data` folder.
- `NexusData` is deliberately ignored. Vortex tracks a mod's Nexus identity itself, and honouring an
  archive's own claim about its mod id is a route to mods attributed to the wrong page.
- The user's choices are recorded on the mod as an `hd2ModOptions` attribute, by name, so a support
  report says what was actually installed.

### When there is no manifest

Most mods do not ship one. The extension then infers the choice from the folder layout: every folder
that directly holds at least one patch file becomes one option, and the list is a radio group. One
such folder means no question at all.

The important property is that **the folder is the question, not the file name**. A version of a mod
that ships `<hash>.patch_0` plus its `.gpu_resources` and `.stream` sidecars is one choice, asked
once — not three independent questions whose answers could contradict each other.

---

## See also

`INSTALLER_SYSTEM.md` (`registerInstaller` test/install contracts, and the extraction directory the
manifest is read from).
`NOTIFICATIONS_DIALOGS.md` (`showDialog` content — in particular why only one `choices` radio group
fits in a dialog, which is what shapes the option picker).
`NON_UE_LOAD_ORDER_PAGES.md` (the Helldivers 2 load order page, which orders the patch files this
manifest selects).
`REGISTER_MERGE.md` (the merge step that combines the selected patch files across mods).
`NEXUS_MODS_API.md` (mod identity and update tracking, i.e. what `NexusData` would otherwise
duplicate).
