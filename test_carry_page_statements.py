"""
test_carry_page_statements.py

Offline test for carry_page_statements.py against a temporary repo: no API call, nothing in the
working tree is touched. Covers line tidying (leading closers, trailing openers, list wrappers,
unbalanced tags; in blocks also stray or unclosed lists and lists left empty), every placement target, an install line without markup going to Usage Notes,
the [summary] note (created, then appended to), a second application changing nothing, and a
missing page reported as an error.

Usage:
    python test_carry_page_statements.py

Exit code: 0 when every check passes (prints ALL OK), non-zero on the first failed check.
"""

import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import carry_page_statements as cps  # noqa: E402
import sync_mod_pages as smp  # noqa: E402

PAGE = """This extension adds Fake modding support to Vortex Mod Manager.

[b]✅ Supported Versions:[/b]
[list]
[*]Steam[/*]
[/list]

[b]\U0001F6E0️ Mod Installation Notes:[/b]
[list]
[*]Paks mods with a ".pak" file install to the "Mods" folder.[/*]
[/list]
[b]\U0001F4CB Usage Notes:[/b]
[list]
[*]You can open several useful files/folders/URLs using the buttons within the folder icon on the Mods toolbar.[/*]
[/list]

[b]❤️ Support the Mod Author: [/b]
If you would like to support my work, you can do so below.
"""


def check_wrap():
    assert cps._wrap_items(["Heading:", "[*]a[/*]", "[*]b[/*]", "Text"]) == [
        "Heading:", "[list]", "[*]a[/*]", "[*]b[/*]", "[/list]", "Text"]
    already = ["[list]", "[*]a[/*]", "[/list]"]
    assert cps._wrap_items(already) == already
    # A stray closer must not push the depth below zero and wrap the next list a second time.
    assert cps._wrap_items(["[/list]Classic:", "[list]", "[*]a[/*]", "[/list]"]) == [
        "[/list]Classic:", "[list]", "[*]a[/*]", "[/list]"]
    print("wrap ok")


def check_tidy_block():
    # Leading closer of the list before it on the live page: dropped.
    assert cps.tidy_block(["[/list][size=3]Classic:[/size]", "[list]", "[*]a[/*]", "[/list]"]) == [
        "[size=3]Classic:[/size]", "[list]", "[*]a[/*]", "[/list]"]
    # A list whose closer sat on a live line that is not carried: closed at the block end.
    assert cps.tidy_block(["Note:", "[list]", "[*]a[/*]"]) == ["Note:", "[list]", "[*]a[/*][/list]"]
    # A list left empty after its items were dropped: removed.
    assert cps.tidy_block(["[b]Heading[/b]", "[list]", "[/list]", "Text."]) == ["[b]Heading[/b]", "Text."]
    # A closer put after the last [/list] has no words: still a list line, never "already present".
    assert cps._markup_only("[/list][/b]") and not cps._markup_only("[*]Note.[/*]")
    print("tidy_block ok")


def check_tidy():
    assert cps.tidy("[/b][/size]Credit to X for Y.") == "Credit to X for Y."
    assert cps.tidy("[*]Reinstall after updates.[/*]") == "Reinstall after updates."
    assert cps.tidy("[/list][color=#ffff00][img]https://x/y.jpg[/img][/color]") == "[color=#ffff00][img]https://x/y.jpg[/img][/color]"
    assert cps.tidy("[b][color=#ea9999]Hardlinks only.[/color]") == "[b][color=#ea9999]Hardlinks only.[/color][/b]"
    assert cps.tidy("Text[/b] more") == "Text more"
    assert cps.tidy("Line [size=3]") == "Line"
    print("tidy ok")


def main():
    check_tidy()
    check_tidy_block()
    check_wrap()
    with tempfile.TemporaryDirectory(prefix="cps_") as tmp:
        cps.REPO_ROOT = tmp
        folder = os.path.join(tmp, "game-fake")
        os.makedirs(folder)
        path = os.path.join(folder, "DESCRIPTION.bbcode")
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(PAGE)
        decision = {"carry": [
            {"to": "opening", "text": "This extension automatically downloads [url=https://x/19]the Mod Loader[/url]."},
            {"to": "warnings", "text": "[b][color=#ea9999]Mods only work with hardlinks.[/color][/b]"},
            {"to": "install", "text": "[*][color=#ffff00]Sorts paks in the Load Order tab.[/color][/*]"},
            {"to": "install", "text": "[*]Includes download buttons for tools.[/*]"},
            {"to": "usage", "text": "[*]Reinstall the studio mod after each game update.[/*]"},
            {"to": "credits", "text": "[/b]Credit to Someone for something."},
            {"to": "end", "text": "[img]https://x/banner.jpg[/img]"},
            {"to": "summary", "text": "Load Order support for pak mods."},
            {"to": "summary", "text": "SMF installed automatically."},
        ], "drop": [{"text": "Xbox - NEW!", "why": "stale tag"}]}
        placed, skipped, errors = cps.carry_page("fake", decision, dry_run=False)
        assert (placed, skipped, errors) == (9, 0, []), (placed, skipped, errors)
        text = open(path, encoding="utf-8").read()
        lines = text.split("\n")
        idx = {k: next(i for i, ln in enumerate(lines) if k in ln) for k in (
            "the Mod Loader", "Supported Versions", "hardlinks", "Mod Installation Notes",
            "Sorts paks", "Usage Notes", "download buttons", "Reinstall the studio", "Credits:",
            "Credit to Someone", "banner.jpg", "Support the Mod Author", "[summary]")}
        assert idx["[summary]"] == 1 and idx["the Mod Loader"] < idx["Supported Versions"], idx
        assert idx["Supported Versions"] < idx["hardlinks"] < idx["Mod Installation Notes"] < idx["Sorts paks"] < idx["Usage Notes"], idx
        assert idx["Usage Notes"] < idx["download buttons"] < idx["Reinstall the studio"], "plain install line goes to Usage Notes"
        assert idx["Reinstall the studio"] < idx["Credits:"] < idx["Credit to Someone"] < idx["banner.jpg"] < idx["Support the Mod Author"], idx
        assert lines[idx["Sorts paks"]] == "[*][color=#ffff00]Sorts paks in the Load Order tab.[/color][/*]"
        assert lines[idx["Credit to Someone"] - 1:idx["Credit to Someone"] + 2] == [
            "[list]", "[*]Credit to Someone for something.[/*]", "[/list]"], "credits are a bulleted list"
        assert lines[1] == "[summary]Load Order support for pak mods. SMF installed automatically.[/summary]", lines[1]
        assert "\n\n\n" not in text
        body, note = smp.split_summary_note(text)
        assert "[summary]" not in body and note.endswith("SMF installed automatically.")
        print("placement ok: every target in its section, plain install line moved to Usage Notes, summary note built")

        placed, skipped, errors = cps.carry_page("fake", decision, dry_run=False)
        assert (placed, skipped, errors) == (0, 9, []) and open(path, encoding="utf-8").read() == text
        print("idempotent ok: a second run places nothing")

        cps.carry_page("fake", {"carry": [{"to": "credits", "text": "Credit to Another for more."}]}, dry_run=False)
        text = open(path, encoding="utf-8").read()
        assert "[*]Credit to Someone for something.[/*]\n[*]Credit to Another for more.[/*]\n[/list]" in text, text
        assert text.index("Credit to Another") < text.index("banner.jpg")
        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(text.replace("[*]Credit to Another for more.[/*]\n", ""))
        print("credits ok: a later credit joins the existing list, above the page-end images")

        before = open(path, encoding="utf-8").read()
        placed, _, _ = cps.carry_page("fake", {"carry": [{"to": "usage", "text": "New note."}]}, dry_run=True)
        assert placed == 1 and open(path, encoding="utf-8").read() == before
        print("dry-run ok")

        with open(path, "w", encoding="utf-8", newline="\n") as f:
            f.write(PAGE)
        block = {"carry": [
            {"to": "opening", "text": "First opening line."},
            {"to": "opening", "text": "Second opening line."},
            {"to": "end", "text": "[b]A few things to note:[/b]"},
            {"to": "end", "text": "[list]"},
            {"to": "end", "text": "[*]Note one.[/*]"},
            {"to": "end", "text": "[/list]"},
        ]}
        placed, _, errors = cps.carry_page("fake", block, dry_run=False)
        text = open(path, encoding="utf-8").read()
        lines = text.split("\n")
        at = {k: next(i for i, ln in enumerate(lines) if k in ln) for k in (
            "First opening", "Second opening", "Supported Versions", "A few things", "Note one", "Support the Mod Author")}
        assert placed == 6 and not errors, (placed, errors)
        assert at["First opening"] + 1 == at["Second opening"] < at["Supported Versions"], at
        assert lines[at["A few things"]:at["A few things"] + 4] == [
            "[b]A few things to note:[/b]", "[list]", "[*]Note one.[/*]", "[/list]"], lines
        assert at["Note one"] < at["Support the Mod Author"], at
        placed, _, _ = cps.carry_page("fake", block, dry_run=False)
        assert placed == 0 and open(path, encoding="utf-8").read() == text, "a list-only remainder must not be placed again"
        print("blocks ok: consecutive lines keep their order, a custom section keeps its heading and list")

        _, _, errors = cps.carry_page("missing", decision, dry_run=False)
        assert errors and "DESCRIPTION.bbcode" in errors[0]
        _, _, errors = cps.carry_page("fake", {"carry": [{"to": "nowhere", "text": "x y z"}]}, dry_run=False)
        assert errors and "unknown" in errors[0]
        print("errors ok")
    print("ALL OK")


if __name__ == "__main__":
    main()
