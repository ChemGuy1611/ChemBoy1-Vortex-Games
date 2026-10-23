"""
test_discovery_ids.py

Offline test for vortex_utils.add_to_discovery_ids and the store-id audit-skip helpers
under it (is_store_id_parked, store_id_skip_reason). Every case is a small index.js snippet
held in a string, so nothing in the repo is read or written.

Covers: a real-valued store const being appended and a null / "XXX" one left out; the
append order (DISCOVERY_ID_APPEND_ORDER) on a fresh [STEAMAPP_ID] scaffold; an empty array
taking the name alone instead of the sparse "[, X]"; a trailing comma and a trailing
"// note" staying in place; a commented-out entry counting as present (the parked-store
shape); EAAPP_ID not being mistaken for EAAPP_ID_DEMO; and a store-id marker blocking the
append - on the const declaration, or on a comment-only line directly above it - while a
marker trailing another const's line does not reach the next one. The marker helpers are
checked directly on the same placements.

Run it after any change to add_to_discovery_ids, DISCOVERY_ID_APPEND_ORDER or the
audit-skip marker helpers in vortex_utils.py.

Usage:
    python test_discovery_ids.py

Exit code: 0 when every check passes (prints ALL OK), non-zero on the first failed check.
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import vortex_utils as vu  # noqa: E402
from vortex_utils import (  # noqa: E402
    add_to_discovery_ids, audit_skip_lines, is_store_id_parked, store_id_skip_reason,
    AUDIT_SKIP_STORE_ID,
)


def snippet(consts, array):
    """Build a minimal index.js: the given const lines, then the discovery array."""
    return 'const STEAMAPP_ID = "1";\n' + consts + "const DISCOVERY_IDS_ACTIVE = " + array + ";\n"


def array_of(src):
    """Return the text between DISCOVERY_IDS_ACTIVE's brackets."""
    return src.split("DISCOVERY_IDS_ACTIVE = [", 1)[1].split("];", 1)[0]


def main():
    # Real value appended; null and "XXX" placeholder left out
    src = snippet('const EPICAPP_ID = "abc";\nconst GOGAPP_ID = null;\nconst XBOXAPP_ID = "XXX";\n', "[STEAMAPP_ID]")
    assert array_of(add_to_discovery_ids(src)) == "STEAMAPP_ID, EPICAPP_ID", array_of(add_to_discovery_ids(src))
    print("real value ok: appended, null and XXX left out")

    # Canonical order on a fresh scaffold, whatever order the consts are declared in
    src = snippet(
        'const STEAMAPP_ID_DEMO = "2";\nconst XBOXAPP_ID = "Pub.Game";\n'
        'const EPICAPP_ID = "abc";\nconst GOGAPP_ID = "123";\n',
        "[STEAMAPP_ID]",
    )
    want = "STEAMAPP_ID, GOGAPP_ID, EPICAPP_ID, XBOXAPP_ID, STEAMAPP_ID_DEMO"
    assert array_of(add_to_discovery_ids(src)) == want, array_of(add_to_discovery_ids(src))
    assert vu.DISCOVERY_ID_APPEND_ORDER[:3] == ("GOGAPP_ID", "EPICAPP_ID", "XBOXAPP_ID")
    print("order ok: Steam, GOG, Epic, Xbox, Demo")

    # Empty array takes the name alone - never the sparse "[, X]"
    src = 'const EPICAPP_ID = "abc";\nconst DISCOVERY_IDS_ACTIVE = [];\n'
    assert array_of(add_to_discovery_ids(src)) == "EPICAPP_ID", array_of(add_to_discovery_ids(src))
    print("empty array ok: no sparse hole")

    # Trailing comma and trailing // note stay where they are
    src = snippet('const EPICAPP_ID = "abc";\n', "[\n  STEAMAPP_ID, // note\n]")
    out = add_to_discovery_ids(src)
    assert "STEAMAPP_ID, EPICAPP_ID, // note\n]" in out, repr(array_of(out))
    print("splice ok: trailing comma and // note kept")

    # A commented-out entry counts as present: the parked-store shape is left alone
    src = snippet('const XBOXAPP_ID = "Pub.Game";\n', "[\n  STEAMAPP_ID,\n  //XBOXAPP_ID, // not supported yet\n]")
    assert add_to_discovery_ids(src) == src
    print("commented entry ok: parked store stays parked")

    # Word boundary: EAAPP_ID_DEMO in the array does not count as EAAPP_ID
    src = snippet('const EAAPP_ID = "ea1";\nconst EAAPP_ID_DEMO = "ea2";\n', "[STEAMAPP_ID, EAAPP_ID_DEMO]")
    assert array_of(add_to_discovery_ids(src)) == "STEAMAPP_ID, EAAPP_ID_DEMO, EAAPP_ID", array_of(add_to_discovery_ids(src))
    print("word boundary ok: EAAPP_ID_DEMO is not EAAPP_ID")

    # Marker on the const declaration: parked, never appended
    on_decl = snippet(
        'const XBOXAPP_ID = "Pub.Game"; //!audit-skip: store-id - crashes on launch\n', "[STEAMAPP_ID]"
    )
    assert add_to_discovery_ids(on_decl) == on_decl
    assert is_store_id_parked(on_decl, "XBOXAPP_ID")
    skip = audit_skip_lines(on_decl, AUDIT_SKIP_STORE_ID, wrapped=False)
    assert store_id_skip_reason(on_decl.splitlines(), skip, "XBOXAPP_ID") == "crashes on launch"
    print("marker on declaration ok: not appended, reason read back")

    # Marker on a comment-only line directly above the const: parked too
    above = snippet(
        '//!audit-skip: store-id - Epic build layout not supported\nconst EPICAPP_ID = "abc";\n', "[STEAMAPP_ID]"
    )
    assert add_to_discovery_ids(above) == above
    assert is_store_id_parked(above, "EPICAPP_ID")
    print("marker above ok: comment-only line covers the next const")

    # A marker trailing one const's code does not reach the next line's const
    trailing = snippet(
        'const GOGAPP_ID = null; //!audit-skip: store-id - GOG listing is a different game\n'
        'const EPICAPP_ID = "abc";\n',
        "[STEAMAPP_ID]",
    )
    assert is_store_id_parked(trailing, "GOGAPP_ID")
    assert not is_store_id_parked(trailing, "EPICAPP_ID")
    assert array_of(add_to_discovery_ids(trailing)) == "STEAMAPP_ID, EPICAPP_ID", array_of(add_to_discovery_ids(trailing))
    print("trailing marker ok: covers its own line only")

    # A marker with no reason is ignored: the const is not parked and gets appended
    bare = snippet('const EPICAPP_ID = "abc"; //!audit-skip: store-id\n', "[STEAMAPP_ID]")
    assert not is_store_id_parked(bare, "EPICAPP_ID")
    assert array_of(add_to_discovery_ids(bare)) == "STEAMAPP_ID, EPICAPP_ID", array_of(add_to_discovery_ids(bare))
    print("bare marker ok: no reason, no suppression")

    print("ALL OK")


if __name__ == "__main__":
    main()
