# Nexus Mods File Object Properties

Properties returned by the mod files endpoints:
- `GET /v1/games/{domain}/mods/{mod_id}/files.json`
- `GET /v1/games/{domain}/mods/{mod_id}/files/{file_id}.json`

---

## Response Wrapper (list endpoint only)

| key | type | description |
| --- | --- | --- |
| `files` | `ModFile[]` | Array of file objects |
| `file_updates` | `FileUpdate[]` | Array of file update records |

---

## `files[]` — ModFile Object

| property | type | description |
| --- | --- | --- |
| `id` | `[number, number]` | Legacy tuple: `[file_id, game_id]` where `game_id` is the internal Nexus numeric game ID (not the domain string) |
| `uid` | `number` | Globally unique file identifier derived from the `id` tuple |
| `file_id` | `number` | The file's ID on this mod page; use this for API calls |
| `name` | `string` | Display name shown on the mod page |
| `version` | `string` | Version string for this specific file |
| `mod_version` | `string` | Version of the mod at the time this file was uploaded |
| `category_id` | `number` | Numeric category; see [nexus-file-categories.md](nexus-file-categories.md) |
| `category_name` | `string` | Human-readable category name (e.g. `"MAIN"`, `"ARCHIVED"`) |
| `is_primary` | `boolean` | `true` if this is the featured/primary file shown on the mod page |
| `file_name` | `string` | Actual filename used for the download (includes mod ID and version suffix) |
| `size` | `number` | File size in KB — legacy duplicate of `size_kb` |
| `size_kb` | `number` | File size in KB |
| `size_in_bytes` | `number` | File size in bytes |
| `uploaded_timestamp` | `number` | Unix timestamp (seconds) of upload |
| `uploaded_time` | `string` | ISO 8601 upload time (e.g. `"2018-02-11T03:50:50.000+00:00"`) |
| `description` | `string` | Short description for this file; may be empty string |
| `changelog_html` | `string \| null` | HTML changelog for this file version; `null` if not set |
| `external_virus_scan_url` | `string \| null` | VirusTotal scan URL; `null` if not scanned |
| `content_preview_link` | `string` | URL to a JSON metadata file listing the archive's contents |

### Notes

- `category_id === 1` is the conventional filter for MAIN files when auto-downloading.
- `size` and `size_kb` always have the same value; prefer `size_in_bytes` for precision.
- `id[1]` is the internal Nexus numeric game ID, **not** the domain string used in API paths.

---

## `file_updates[]` — FileUpdate Object

Describes a supersession relationship between two files (old → new).

| property | type | description |
| --- | --- | --- |
| `old_file_id` | `number` | ID of the file being superseded |
| `new_file_id` | `number` | ID of the file that replaces it |
| `old_file_name` | `string` | Filename of the old file |
| `new_file_name` | `string` | Filename of the new file |
| `uploaded_timestamp` | `number` | Unix timestamp (seconds) when the new file was uploaded |
| `uploaded_time` | `string` | ISO 8601 upload time of the new file |
