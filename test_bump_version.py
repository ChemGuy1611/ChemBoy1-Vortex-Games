"""
test_bump_version.py

Offline test for the --move-planned and --note options of bump_version.py and the
vortex_utils helpers under them (split_planned_bullets, move_planned_to_version,
add_changelog_note). Every case builds a throwaway extension folder in a temp directory,
so nothing in the repo is read or written.

Covers: the default (no flag) leaving the stub bare and Planned untouched; 'done' moving
only bullets that read as done and keeping open plans, a "None" placeholder and a wrapped
(two-line) bullet in the right place; 'all' moving every bullet except the placeholder; the
Planned section being deleted once nothing is left in it; a stub that already has note
text never being overwritten; --dry-run writing nothing; an extension with no Planned
section; and --note replacing a bare stub, going after moved bullets, accepting a leading
dash, writing nothing on --dry-run, and add_changelog_note being idempotent and leaving the
last section of a file with a single final newline.

Run it after any change to the CHANGELOG helpers in vortex_utils.py or to the bump flow.

Usage:
    python test_bump_version.py

Exit code: 0 when every check passes (prints ALL OK), non-zero on the first failed check.
"""

import contextlib
import io
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import bump_version as bv  # noqa: E402
import vortex_utils as vu  # noqa: E402
from vortex_utils import write_text_atomic  # noqa: E402

INDEX_JS = "/*\nStructure: Basic\nVersion: 1.0.0\nDate: 2026-01-01\n*/\n"

MIXED = """# Changelog

## Planned Improvements (Not Yet Released)

- None
- ? handle .rpack files?
- Fixed: first thing
  that wraps onto a second line
- Added an "Open SteamDB Page" button.
- Changed launcher settings so that Steam launches through Steam.
- Removed: an old thing

## [1.0.0] - 2026-01-01

- Initial release
"""
ONLY_DONE = """# Changelog

## Planned Improvements (Not Yet Released)

- Fixed: only thing
- Added: another thing

## [1.0.0] - 2026-01-01

- Initial release
"""
NO_PLANNED = "# Changelog\n\n## [1.0.0] - 2026-01-01\n\n- Initial release\n"


def make(tmp, name, changelog):
    folder = os.path.join(tmp, name)
    os.makedirs(folder)
    write_text_atomic(os.path.join(folder, "info.json"), '{\n  "id": "%s",\n  "version": "1.0.0"\n}\n' % name)
    write_text_atomic(os.path.join(folder, "index.js"), INDEX_JS)
    write_text_atomic(os.path.join(folder, "CHANGELOG.md"), changelog)
    return folder


def bump(folder, move_planned=None, dry_run=False, manual_ver=None, note=None):
    with contextlib.redirect_stdout(io.StringIO()):
        return bv._process(folder, os.path.basename(folder), "patch", dry_run, manual_ver, False, move_planned, note)


def read(folder):
    with open(os.path.join(folder, "CHANGELOG.md"), encoding="utf-8") as f:
        return f.read()


def section(text, heading_start):
    """Body of the '## ...' section whose heading starts with heading_start."""
    start = text.index(heading_start)
    body = text[text.index("\n", start) + 1:]
    nxt = body.find("\n## ")
    return body if nxt < 0 else body[:nxt]


def main():
    with tempfile.TemporaryDirectory(prefix="bump_") as tmp:
        # default: unchanged behaviour
        f = make(tmp, "plain", MIXED)
        assert bump(f)
        t = read(f)
        assert "## [1.0.1]" in t and "- Fixed: first thing" in section(t, "## Planned")
        assert section(t, "## [1.0.1]").strip() == "-", repr(section(t, "## [1.0.1]"))
        print("default ok: stub bare, Planned untouched")

        # done: only finished bullets move
        f = make(tmp, "done", MIXED)
        assert bump(f, "done")
        t = read(f)
        stub = section(t, "## [1.0.1]")
        planned = section(t, "## Planned")
        for must in ("- Fixed: first thing\n  that wraps onto a second line",
                     '- Added an "Open SteamDB Page" button.', "- Removed: an old thing"):
            assert must in stub, (must, stub)
        for stays in ("- None", "- ? handle .rpack files?", "- Changed launcher settings so that Steam"):
            assert stays in planned and stays not in stub, (stays, planned)
        assert "Fixed: first thing" not in planned
        assert t.index("## Planned") < t.index("## [1.0.1]") < t.index("## [1.0.0]")
        print("done ok: shipped bullets moved (wrapped one whole), open plans and placeholder stay")

        # all: everything but the placeholder
        f = make(tmp, "all", MIXED)
        assert bump(f, "all")
        t = read(f)
        stub = section(t, "## [1.0.1]")
        assert "- ? handle .rpack files?" in stub and "- Changed launcher settings" in stub
        assert "- None" not in stub and "- None" in section(t, "## Planned")
        print("all ok: every real bullet moved, placeholder kept")

        # emptied Planned section is deleted
        f = make(tmp, "emptied", ONLY_DONE)
        assert bump(f, "done")
        t = read(f)
        assert "Planned Improvements" not in t, t
        assert section(t, "## [1.0.1]").strip().splitlines() == ["- Fixed: only thing", "- Added: another thing"]
        assert t.startswith("# Changelog\n\n## [1.0.1]"), t[:60]
        print("emptied ok: Planned section removed, stub filled")

        # a stub that already has note text is never overwritten
        f = make(tmp, "hand", ONLY_DONE.replace("## [1.0.0]", "## [1.0.1] - 2026-02-02\n\n- Hand written note\n\n## [1.0.0]"))
        assert bump(f, "done")
        t = read(f)
        assert section(t, "## [1.0.1]").strip() == "- Hand written note", section(t, "## [1.0.1]")
        assert "- Fixed: only thing" in section(t, "## Planned")
        print("hand-written stub ok: not overwritten, Planned untouched")

        # dry run writes nothing
        f = make(tmp, "dry", MIXED)
        assert bump(f, "done", dry_run=True)
        assert read(f) == MIXED and '"version": "1.0.0"' in open(os.path.join(f, "info.json")).read()
        print("dry-run ok: no files written")

        # no Planned section
        f = make(tmp, "noplan", NO_PLANNED)
        assert bump(f, "done")
        assert "## [1.0.1]" in read(f) and section(read(f), "## [1.0.1]").strip() == "-"
        print("no Planned section ok: stub left bare, no error")

        # --note on a bare stub replaces it; Planned is untouched
        f = make(tmp, "note", MIXED)
        assert bump(f, note="Added the game's ID to the info file.")
        t = read(f)
        assert section(t, "## [1.0.1]").strip() == "- Added the game's ID to the info file.", section(t, "## [1.0.1]")
        assert "- Fixed: first thing" in section(t, "## Planned")
        print("note ok: bare stub replaced, Planned untouched")

        # a leading "- " on the note is accepted, not doubled
        f = make(tmp, "notedash", NO_PLANNED)
        assert bump(f, note="- Added a thing.")
        assert section(read(f), "## [1.0.1]").strip() == "- Added a thing."
        print("note ok: leading dash not doubled")

        # --note after --move-planned goes last, after the moved bullets
        f = make(tmp, "notemoved", ONLY_DONE)
        assert bump(f, "done", note="Added the ID.")
        lines = section(read(f), "## [1.0.1]").strip().splitlines()
        assert lines == ["- Fixed: only thing", "- Added: another thing", "- Added the ID."], lines
        print("note ok: appended after the moved bullets")

        # dry run with a note writes nothing
        f = make(tmp, "notedry", MIXED)
        assert bump(f, dry_run=True, note="Added the ID.")
        assert read(f) == MIXED
        print("note dry-run ok: no files written")

        # add_changelog_note: idempotent, and the last section of the file keeps a single final newline
        f = make(tmp, "notelast", NO_PLANNED)
        assert vu.add_changelog_note(f, "1.0.0", "Second bullet.") is True
        assert vu.add_changelog_note(f, "1.0.0", "Second bullet.") is False
        assert vu.add_changelog_note(f, "9.9.9", "No such section.") is False
        t = read(f)
        assert t.endswith("- Initial release\n- Second bullet.\n") and not t.endswith("\n\n"), repr(t[-60:])
        print("add_changelog_note ok: idempotent, missing section refused, one final newline")

    print("ALL OK")


if __name__ == "__main__":
    main()
