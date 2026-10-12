#!/usr/bin/env python3
"""
splice_template_functions.py

Copies named top-level functions out of a template's index.js into a game's index.js,
verbatim, each with its leading `//` comment lines, inserted immediately before an anchor
line. This is the mechanical half of bringing a game up to template shape parity
(audit_parity.py lists what is missing); the wiring that calls the functions (toggles,
registerInstaller, setup() calls) stays a hand edit.

Each spec is `names@anchor`: comma-separated function names, then the text a line of the
game's index.js must START with. The anchor must match exactly one line start. A game that
already defines any named function is refused. Nothing is written unless every spec
resolves; a syntax error in the result (node --check) also aborts the write.

--block START END ANCHOR copies a raw run of template lines instead of a function: from the
line equal to START (it may span several lines, joined with real newlines) through the line
equal to END, inclusive, followed by a blank line. Use it for text the function extractor
cannot carry whole, such as a function the template keeps inside a /* ... */ block comment
(splicing the bare function would silently uncomment it). START must match once in the
template, END is the first matching line after it, ANCHOR is a line-start in the game that
must match once. A game that already contains the block verbatim is refused.

Usage:
    python splice_template_functions.py GAME_ID TEMPLATE "names@anchor" ["names@anchor" ...]
    python splice_template_functions.py GAME_ID TEMPLATE "names@anchor" --dry-run
    python splice_template_functions.py GAME_ID TEMPLATE --block START END ANCHOR [--block ...]

    GAME_ID    bare id (farcry4, not game-farcry4)
    TEMPLATE   template folder name (template-farcry)

Examples:
    python splice_template_functions.py starwarsoutlaws template-snowdropengine \\
        "testFallback,installFallback,fallbackInstallerNotify@// AUTOMATIC DOWNLOAD FUNCTIONS" \\
        "setupNotify,modFoldersEnsureWritable@//Setup function"
    python splice_template_functions.py bloodthief template-godot \\
        --block $'/*\\nasync function resolveGameVersion(gamePath) {' '} //*/' \\
        'async function modFoldersEnsureWritable'

Function specs apply first, in order, then blocks; two with the same anchor land one after the
other. Verify afterwards with: python audit_parity.py --game GAME_ID --bodies NAME,NAME

Requirements:
    No additional packages required (Python stdlib only). node on PATH for the syntax check.
"""

import argparse
import os
import re
import sys

from vortex_utils import (
    REPO_ROOT, read_index_js, write_index_js, top_level_function_text, node_check_source,
)


def _insert_before_anchor(src, anchor, text):
    """Insert text immediately before the single game line that starts with anchor."""
    hits = [m.start() for m in re.finditer("^" + re.escape(anchor), src, re.MULTILINE)]
    if len(hits) != 1:
        print(f"ERROR: anchor matches {len(hits)} lines (want 1): {anchor!r}")
        sys.exit(1)
    return src[:hits[0]] + text + src[hits[0]:]


def _template_block(tsrc, start, end):
    """Template text from the line(s) equal to start through the next line equal to end."""
    s_hits = [m.start() for m in re.finditer("^" + re.escape(start) + "$", tsrc, re.MULTILINE)]
    if len(s_hits) != 1:
        print(f"ERROR: block start matches {len(s_hits)} places in the template (want 1): {start!r}")
        sys.exit(1)
    e_hit = next((m.end() for m in re.finditer("^" + re.escape(end) + "$", tsrc, re.MULTILINE)
                  if m.start() > s_hits[0]), None)
    if e_hit is None:
        print(f"ERROR: block end not found after the start: {end!r}")
        sys.exit(1)
    return tsrc[s_hits[0]:e_hit]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("Usage:")[0].strip())
    parser.add_argument("game_id", metavar="GAME_ID", help="bare game id (farcry4)")
    parser.add_argument("template", metavar="TEMPLATE", help="template folder name")
    parser.add_argument("specs", nargs="*", metavar="names@anchor",
                        help="comma-separated function names, '@', line-start anchor text")
    parser.add_argument("--block", nargs=3, action="append", default=[],
                        metavar=("START", "END", "ANCHOR"),
                        help="copy the raw template lines START..END before the game line "
                             "starting with ANCHOR (repeatable)")
    parser.add_argument("--dry-run", action="store_true", help="resolve and report, write nothing")
    args = parser.parse_args()
    if not args.specs and not args.block:
        parser.error("give at least one names@anchor spec or --block")
    if any("@" not in s for s in args.specs):
        parser.error("every spec needs a '@' between the function names and the anchor")
    game_id, template, specs, dry = args.game_id, args.template, args.specs, args.dry_run
    folder = os.path.join(REPO_ROOT, f"game-{game_id}")
    src = read_index_js(folder)
    tsrc = read_index_js(os.path.join(REPO_ROOT, template))
    if src is None or tsrc is None:
        print(f"ERROR: index.js not found for game-{game_id} or {template}")
        sys.exit(2)

    for spec in specs:
        names, anchor = spec.split("@", 1)
        names = [n for n in names.split(",") if n]
        blocks = []
        for name in names:
            if top_level_function_text(src, name) is not None:
                print(f"ERROR: game-{game_id} already defines {name}")
                sys.exit(1)
            block = top_level_function_text(tsrc, name, with_comments=True)
            if block is None:
                print(f"ERROR: {template} has no function {name}")
                sys.exit(1)
            blocks.append(block if block.endswith("\n") else block + "\n")
        text = "\n".join(blocks) + "\n"
        src = _insert_before_anchor(src, anchor, text)
        print(f"  + {','.join(names)} before {anchor[:50]!r} ({text.count(chr(10))} lines)")

    for start, end, anchor in args.block:
        block = _template_block(tsrc, start, end)
        if block in src:
            print(f"ERROR: game-{game_id} already contains this block verbatim")
            sys.exit(1)
        text = block + "\n\n"
        src = _insert_before_anchor(src, anchor, text)
        print(f"  + block {start.splitlines()[0][:30]!r}..{end[:20]!r} before {anchor[:50]!r} "
              f"({text.count(chr(10))} lines)")

    ok, err = node_check_source(src)
    if ok is False:
        print(f"ERROR: result fails node --check, not written: {err}")
        sys.exit(1)
    if dry:
        print("dry run, nothing written")
        return
    write_index_js(folder, src)
    print(f"written game-{game_id}/index.js")


if __name__ == "__main__":
    main()
