# Railloader

Railloader is the second mod loader used by *Railroader*, alongside Unity Mod Manager. Most of the
game's Nexus mods ship in Railloader format, so an extension for the game has to install it even
though the two loaders are unrelated projects.

Two facts govern anything built on it:

- **Its mods live in the same folder UMM uses** — `<gamePath>\Mods\<Name>\` — but the two formats
  are not interchangeable. The manifest file present in the archive is what tells them apart.
- **The loader binary currently has no reachable download source.** Mod support is fully
  deliverable; automatic acquisition of the loader itself is not. See *Distribution* below.

---

## Mod format

A Railloader mod is a folder under `<gamePath>\Mods\<Name>\` containing `Definition.json`, one or
more `.dll` assemblies, and whatever data `.json` files the mod ships.

```json
{
  "manifestVersion": 1,
  "id": "Joo.TimeSyncMod",
  "name": "TimeSync Mod",
  "version": "1.0.26128.1713",
  "assemblies": [ "TimeSyncMod" ]
}
```

| Field | Notes |
| --- | --- |
| `manifestVersion` | Format version; `1` in every sampled mod |
| `id` | Reverse-DNS style unique identifier; the conventional folder name |
| `name` | Display name |
| `version` | Free-form; commonly a build-stamped four-part number |
| `assemblies` | Assembly names to load, without the `.dll` extension |

### Archive shapes

Sampled across recently-updated Nexus mods and upstream GitHub releases, archives arrive in three
shapes and an installer has to normalise all of them to `<Name>/...`:

| Shape | Example | Handling |
| --- | --- | --- |
| `Mods/<Name>/...` | Nexus mods 211 and 628, the Joo200 releases | Strip the leading `Mods/` segment |
| `<Name>/...` | Nexus mods 348, 356, 364 | Keep as-is |
| Flat at root | occasional | Synthesise `<Name>` from `Definition.json`'s `id` |

Stripping `Mods/` matters: the destination mod type already targets `<gamePath>\Mods`, so passing
the segment through produces `Mods\Mods\<Name>`.

---

## Telling the two loaders apart

Both formats land in the same folder, and each loader errors on the other's mods — a UMM mod under
Railloader fails on the missing `Definition.json`, and a Railloader mod under UMM fails on the
missing `info.json`. One shared `Mods` mod type with two installers keyed on which manifest the
archive contains is the arrangement that works:

| Manifest present | Loader | Also expect |
| --- | --- | --- |
| `Definition.json` | Railloader | `.dll` named in `assemblies` |
| `info.json` (any case) | Unity Mod Manager | sibling `.dll` |

---

## Distribution

`railroader.stelltis.ch` is the canonical home cited by every mod page that requires Railloader.
**It does not resolve.** Verified, and worth recording so it is not re-derived:

| Source | Result |
| --- | --- |
| `railroader.stelltis.ch` | No A or AAAA record. Google DoH returns `Status 0` with an SOA-only Authority section, for the host and for `stelltis.ch` itself. NS delegated to Cloudflare; the zone carries no host record |
| Nexus | Not present. GraphQL name searches for `railloader` and `strange customs` return nothing across all games |
| GitHub | No loader repository. `CzBuCHi/Railroader-ModsLoader` is a different project with zero releases; every other hit is a mod, not the loader |
| Wayback Machine | Zero captures for the domain |

Consequences for an extension:

- Do not wire an automatic loader download. There is no URL to point it at.
- Do support a **user-supplied** loader archive through a normal installer, so anyone who kept a
  copy can install it through Vortex.
- A "get the loader" toolbar action should warn that the official host is offline before opening it.
- Re-check the domain before assuming this is permanent — a single DNS query settles it:

  ```text
  https://dns.google/resolve?name=railroader.stelltis.ch&type=A
  ```

  An `Answer` array in the response means the host is back and a direct-URL download route becomes
  possible.

---

## Open question: `winhttp.dll`

Unity Mod Manager's DoorstopProxy install claims `<gamePath>\winhttp.dll`. Any proxy loader using
the same injection technique wants that exact filename. Whether Railloader does is unresolved —
answering it needs the loader archive, which is currently unobtainable. If it does, the two loaders
are mutually exclusive on one install and each installer needs a guard plus a conflict warning.
Treat this as an open test question rather than designing around either answer.

---

## See also

`UNITY_MOD_MANAGER.md` (the other loader for the same game — the `Mods` folder they share, the
`info.json` mod format, and the `winhttp.dll` claim above).
`templates/TEMPLATE_UNITY_UMM.md` (the Vortex template that carries both loaders' support).
`TEMPLATES_OVERVIEW.md` (template selection and the shared extension anatomy).
`INSTALLER_SYSTEM.md` (`registerInstaller` test/install contracts behind the two-installer split).
`FOMOD_INSTALLER.md` (the `ModuleConfig.xml` early-return every `testSupported` keeps).
`NEXUS_MODS_API.md` (the GraphQL search used to rule out a Nexus-hosted copy).
`NOTIFICATIONS_DIALOGS.md` (`showDialog`, behind the offline-host warning).
