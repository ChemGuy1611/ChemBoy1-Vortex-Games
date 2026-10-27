"""
carry_page_statements.py

Carry hand-written statements from the live Nexus mod pages into each extension's
DESCRIPTION.bbcode, from a decisions file, so a later push does not drop them. The statements
come from `sync_mod_pages.py --specials` (its worklist); which of them to carry, and where, is
decided per batch and written to a decisions file. This script only places them.

Decisions file (JSON):
    {
      "<game id>": {
        "carry": [{"to": "<where>", "text": "<the live line, BBCode as on the page>"}],
        "drop":  [{"text": "...", "why": "..."}]
      }
    }

Consecutive entries with the same "to" are placed together as one block in their file order, so
a run of opening lines, or a custom section (its heading line followed by its lines, to "end"),
keeps its live order and shape.

Where a carried line goes ("to"):
    opening   in front of the Supported Versions heading (after the first paragraph when the
              page has none)
    warnings  in front of the Mod Installation Notes heading, as its own paragraph
    install   into the Mod Installation Notes list. generate_notes.js --description rebuilds that
              list and keeps only items carrying BBCode markup ([b], [color=...], [url=...], ...),
              so a line without markup is placed in Usage Notes instead (reported)
    usage     into the Usage Notes list, as a [*]...[/*] item
    credits   at the end of the Credits list under its heading, as a [*]...[/*] item (the section
              is created in front of the support block if absent)
    end       in front of the Support the Mod Author block, as its own paragraph
    summary   into the [summary]...[/summary] note line (created after the first line), which
              sync_mod_pages.py appends to the page summary and never sends as page text

Each line is tidied before it is placed: closing tags it starts with and opening tags it ends
with (left over from BBCode spanning several lines on the live page) are removed, and tags left
unbalanced are closed or dropped. A paragraph block balances its [list] tags the same way and
loses a list left empty by dropped lines. A line whose words are already on the page (compared like
sync_mod_pages.find_specials does) is skipped, so a decisions file can be applied twice.
"drop" entries are only counted; they record what was deliberately left behind.

Usage:
    python carry_page_statements.py DECISIONS.json [--dry-run]

Flags:
    --dry-run   Print what would be placed; write nothing.

Exit code: 1 if a game id has no DESCRIPTION.bbcode, a "to" is unknown or a page lacks the
section a line needs; the other games are still processed. Else 0.
"""

import argparse
import json
import os
import re
import sys

from vortex_utils import REPO_ROOT, GAME_PREFIX, write_text_atomic, log_info, log_warn, log_error
import sync_mod_pages as smp

DESCRIPTION_FILE = "DESCRIPTION.bbcode"
INSTALL_HEADING = "Mod Installation Notes:[/b]"
USAGE_HEADING = "Usage Notes:[/b]"
CREDITS_HEADING_TEXT = "[b]\U0001F91D Credits:[/b]"
CREDITS_HEADING = "Credits:[/b]"
SUPPORT_HEADING = "Support the Mod Author"
TARGETS = ("opening", "warnings", "install", "usage", "credits", "end", "summary")
# Same markup test generate_notes.js uses to keep an author item in a rebuilt list.
_AUTHOR_ITEM = re.compile(r"\[(?:b|i|u|color|size|url|img)[=\]]", re.I)
_TAG = re.compile(r"\[(/?)([a-z]+)(?:=[^\]]*)?\]", re.I)
_PAIRED = {"b", "i", "u", "s", "size", "color", "url", "quote", "center", "font", "spoiler"}


# == Line tidying ==============================================================

_STRUCT_LINE = re.compile(r"^\[(?:list(?:=[^\]]*)?|/list)\]$", re.I)
_LIST_OPEN = re.compile(r"\[list(?:=[^\]]*)?\]", re.I)
_EMPTY_LIST = re.compile(r"\[list(?:=[^\]]*)?\]\s*\[/list\]", re.I)


def _is_struct(text):
    """A bare list open ([list], [list=1]) or close line."""
    return bool(_STRUCT_LINE.match(text.strip()))


def _markup_only(text):
    """A list line, or a line with no words of its own (closers a block balance put after a
    [/list], as in "[/list][/b]"): kept with its block, never skipped as already present."""
    return _is_struct(text) or not smp._plain(text)
# Targets placed as paragraph blocks (as opposed to [*] items in an existing list).
_PARAGRAPH_TARGETS = ("opening", "warnings", "end", "credits")


def tidy(text, keep_lists=False):
    """A live line made to stand on its own: no leading closers or trailing openers, paired
    tags balanced. [*]/[/*]/[list] wrappers are stripped too, unless keep_lists: a custom
    section carried as a paragraph block keeps its own list lines and bullets."""
    s = text.replace("\r", "").strip()
    if keep_lists:
        # Only stray closers in front and openers at the end go; list lines and bullets stay.
        lead = r"^(?:\[/(?!list\])[a-z]+\])\s*"
        tail = r"\s*(?:\[(?!list\])[a-z]+(?:=[^\]]*)?\])$"
    else:
        lead = r"^(?:\[/[a-z]+\]|\[\*\]|\[/?list\])\s*"
        tail = r"\s*(?:\[[a-z]+(?:=[^\]]*)?\]|\[/\*\]|\[/?list\])$"
    while True:
        new = re.sub(lead, "", s, flags=re.I)
        new = re.sub(tail, "", new, flags=re.I)
        if new == s:
            break
        s = new
    # A block that keeps its lists balances them too: a live line can start with the closer of
    # the list before it, or a list's closer can sit on a live line that is not carried.
    paired = _PAIRED | {"list"} if keep_lists else _PAIRED
    out, stack, pos = [], [], 0
    for m in _TAG.finditer(s):
        out.append(s[pos:m.start()])
        pos = m.end()
        closing, name = m.group(1) == "/", m.group(2).lower()
        if name not in paired:
            out.append(m.group(0))
        elif not closing:
            stack.append(name)
            out.append(m.group(0))
        elif name in stack:
            while stack:
                top = stack.pop()
                out.append(f"[/{top}]")
                if top == name:
                    break
        # an orphan closer is dropped
    out.append(s[pos:])
    out.extend(f"[/{name}]" for name in reversed(stack))
    return re.sub(r"[ \t]+$", "", "".join(out)).strip()


def tidy_block(texts):
    """Tidy consecutive paragraph lines as one text, so markup that spans lines on the live page
    (a [b][color=...] run over two lines) stays intact instead of being closed on every line."""
    joined = tidy("\n".join(t.replace("\r", "").strip() for t in texts if t.strip()), keep_lists=True)
    # A list whose items were all dropped is left empty: remove it.
    joined = _EMPTY_LIST.sub("", joined)
    return [ln.strip() for ln in joined.split("\n") if ln.strip()]


def _item(text):
    return f"[*]{text}[/*]"


# == Placement =================================================================

def _find_line(lines, needle, start=0):
    for i in range(start, len(lines)):
        if needle in lines[i]:
            return i
    return -1


def _list_close(lines, heading_at):
    """Index of the [/list] that closes the list under a heading, or -1."""
    open_at = _find_line(lines, "[list]", heading_at)
    if open_at == -1:
        return -1
    for i in range(open_at, len(lines)):
        if "[/list]" in lines[i]:
            return i
    return -1


def _wrap_items(block):
    """Put [list]...[/list] around runs of [*] items that are not already inside a list: an item
    outside a list does not render as a bullet."""
    out, depth, open_run = [], 0, False
    for line in block:
        low = line.lower()
        is_item = low.startswith("[*]")
        if is_item and depth == 0 and not open_run:
            out.append("[list]")
            open_run = True
        elif not is_item and open_run:
            out.append("[/list]")
            open_run = False
        out.append(line)
        depth = max(0, depth + len(_LIST_OPEN.findall(low)) - low.count("[/list]"))
    if open_run:
        out.append("[/list]")
    return out


def _paragraph(lines, at, block):
    """Insert block (a list of lines) as its own paragraph in front of line `at`."""
    block = _wrap_items(block) + [""]
    if at > 0 and lines[at - 1].strip():
        block.insert(0, "")
    lines[at:at] = block


def place(lines, to, texts):
    """Insert a block of tidied lines that share one target, in order.

    Returns (where it went, error or None)."""
    note = to
    if to == "opening":
        # In front of the store list keeps the opening text in its live order.
        at = _find_line(lines, "Supported Versions:")
        if at == -1:
            first = next((i for i, ln in enumerate(lines) if ln.strip()), 0)
            at = next((i for i in range(first, len(lines)) if not lines[i].strip()), len(lines))
        _paragraph(lines, at, texts)
        return note, None
    if to == "warnings":
        at = _find_line(lines, INSTALL_HEADING)
        if at == -1:
            return note, "no Mod Installation Notes heading"
        _paragraph(lines, at, texts)
        return note, None
    if to in ("install", "usage"):
        heading = _find_line(lines, INSTALL_HEADING if to == "install" else USAGE_HEADING)
        close = _list_close(lines, heading) if heading != -1 else -1
        if close == -1:
            return note, f"no {'Mod Installation' if to == 'install' else 'Usage'} Notes list"
        lines[close:close] = [_item(t) for t in texts]
        return note, None
    if to == "credits":
        head = _find_line(lines, CREDITS_HEADING)
        support = _find_line(lines, SUPPORT_HEADING)
        if head == -1:
            if support == -1:
                return note, "no Credits section and no support block"
            _paragraph(lines, support, [CREDITS_HEADING_TEXT, *[_item(t) for t in texts]])
            return note, None
        # The credit lines are the bulleted list right under the heading; images and carried
        # sections after it stay where they are.
        end = head + 1
        while end < len(lines) and lines[end].strip() and SUPPORT_HEADING not in lines[end]:
            end += 1
        if lines[end - 1].strip().lower() == "[/list]":
            lines[end - 1:end - 1] = [_item(t) for t in texts]
        else:
            lines[end:end] = ["[list]", *[_item(t) for t in texts], "[/list]"]
        return note, None
    if to == "end":
        at = _find_line(lines, SUPPORT_HEADING)
        if at == -1:
            lines.extend(["", *texts])
        else:
            _paragraph(lines, at, texts)
        return note, None
    if to == "summary":
        plain = " ".join(" ".join(smp._BBCODE_TAG.sub("", t).split()) for t in texts)
        for i, ln in enumerate(lines):
            m = smp._SUMMARY_NOTE.match(ln)
            if m:
                lines[i] = f"[summary]{' '.join((m.group(1).strip() + ' ' + plain).split())}[/summary]"
                return note, None
        first = next((i for i, ln in enumerate(lines) if ln.strip()), 0)
        lines.insert(first + 1, f"[summary]{plain}[/summary]")
        return note, None
    return note, f'unknown "to": {to}'


def _present(lines, text, to):
    """True when the page already carries the line's words (or the summary note has them)."""
    plain = smp._plain(text)
    if not plain:
        return True
    if to == "summary":
        note = next((m.group(1) for m in (smp._SUMMARY_NOTE.match(ln) for ln in lines) if m), "")
        return plain in smp._plain(note)
    return any(smp._plain(ln) == plain for ln in lines)


def carry_page(game_id, decision, dry_run):
    """Apply one game's decisions; returns (placed, skipped, errors)."""
    path = os.path.join(REPO_ROOT, GAME_PREFIX + game_id, DESCRIPTION_FILE)
    if not os.path.isfile(path):
        return 0, 0, [f"no {DESCRIPTION_FILE}"]
    with open(path, encoding="utf-8") as f:
        original = f.read()
    lines = original.replace("\r\n", "\n").split("\n")
    placed, skipped, errors = 0, 0, []
    # Consecutive entries with the same target are placed as one block, so a run of opening
    # lines or a custom section (its heading line, then its lines) keeps its live order.
    groups = []
    for entry in decision.get("carry", []):
        to = entry.get("to")
        if to not in TARGETS:
            errors.append(f'unknown "to": {to}')
            continue
        text = entry.get("text", "")
        if to in _PARAGRAPH_TARGETS:
            pass  # tidied as a block below
        else:
            text = tidy(text)
            if to == "install" and not _AUTHOR_ITEM.search(text):
                # Without markup the install list rebuild would drop it.
                to = "usage"
                if dry_run:
                    print(f"      (install line without markup -> usage) {smp._ascii(text[:100])}")
        if groups and groups[-1][0] == to:
            groups[-1][1].append(text)
        else:
            groups.append((to, [text]))
    groups = [(to, tidy_block(texts) if to in _PARAGRAPH_TARGETS else texts) for to, texts in groups]
    for to, texts in groups:
        fresh = []
        for text in texts:
            if _markup_only(text):
                fresh.append(text)
            elif _present(lines, text, to) or text in fresh:
                skipped += 1
            else:
                fresh.append(text)
        if all(_markup_only(t) for t in fresh):
            # Nothing but list lines left: the block's content is already on the page.
            skipped += len(fresh)
            continue
        where, err = place(lines, to, fresh)
        if err:
            errors.append(f"{err}: {smp._ascii(fresh[0][:80])}")
            continue
        placed += len(fresh)
        if dry_run:
            for text in fresh:
                print(f"      -> {where}: {smp._ascii(text[:150])}")
    new = re.sub(r"\n{3,}", "\n\n", "\n".join(lines))
    if placed and not dry_run and new != original:
        write_text_atomic(path, new)
    return placed, skipped, errors


def main():
    p = argparse.ArgumentParser(description="Carry live mod page statements into DESCRIPTION.bbcode from a decisions file.")
    p.add_argument("decisions", help="Decisions JSON (see the module docstring).")
    p.add_argument("--dry-run", action="store_true", help="Print what would be placed; write nothing.")
    args = p.parse_args()
    with open(args.decisions, encoding="utf-8") as f:
        decisions = json.load(f)
    totals = {"placed": 0, "skipped": 0, "dropped": 0, "errors": 0}
    for game_id in sorted(decisions):
        decision = decisions[game_id]
        placed, skipped, errors = carry_page(game_id, decision, args.dry_run)
        dropped = len(decision.get("drop", []))
        totals["placed"] += placed
        totals["skipped"] += skipped
        totals["dropped"] += dropped
        totals["errors"] += len(errors)
        verb = "would place" if args.dry_run else "placed"
        log_info(game_id, f"{verb} {placed}, already present {skipped}, dropped {dropped}")
        for e in errors:
            log_error(game_id, e)
    print("\n" + "-" * 50)
    print("  " + ", ".join(f"{n} {k}" for k, n in totals.items()))
    if args.dry_run:
        log_warn("carry", "dry run - nothing written")
    return 1 if totals["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
