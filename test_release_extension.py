"""
test_release_extension.py

Offline test for the bulk-upload behaviour of release_extension.py. No Nexus call, no zip, no
7-Zip run and no file is written: release() is replaced by a stub that reports what an upload
did, and the doc generators are stubbed, so only the run loop in main() is exercised.

Covers: the 429 detector (a Cloudflare rate-limit error is recognised, other HTTP errors are
not), a clean run (exit 0, no pause), --upload-delay (one pause per successful upload, none
after the last id), a 429 mid-run (the run stops, later ids are untouched, the re-run command
names the failed id and every unprocessed one, exit 1), and a non-429 upload failure (exit 1,
the run carries on, no re-run command), and the never-upload refusal (an id from
resources/lists/games-never-upload.txt is refused with --upload and still released without it).

Also covers the info.json "modId" stamp (vortex_utils.set_info_mod_id and release_extension.
sync_info_mod_id) against throwaway files in the system temp dir: added after "gameId" or "id",
placeholder and wrong number replaced, LF and CRLF kept, dry run writes nothing, no URL writes
nothing. And the info.json "contributes" check (vortex_utils.validate_info_contributes): leftover
placeholders, Vortex's value rules, keys missing from index.js, gameEnhancements targets, and
the registerGame-count / gameId warnings. And the ASCII-only name check
(vortex_utils.non_ascii_names) plus sanitize_game_name folding a title to ASCII.

Run it after any change to the run loop, the exit code or the upload error handling in
release_extension.py, or to the modId stamp or the contributes check.

Usage:
    python test_release_extension.py

Exit code: 0 when every check passes (prints ALL OK), non-zero on the first failed check.
"""

import contextlib
import io
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import release_extension as rel  # noqa: E402

RATE_LIMIT_TEXT = (
    "nexus_v3_post_json /uploads/multipart: HTTP 429 Too Many Requests - "
    '{"title":"Error 1015: You are being rate limited","status":429}'
)

sleeps = []


def stub_release(plan):
    """Fake release(): plan maps an id to "ok", "429" or "other" (default "ok")."""

    def fake(game_id, open_browser, dry_run=False, **kw):
        out = kw["out"]
        out.update({"kind": "game", "uploaded": False, "upload_failed": False, "rate_limited": False})
        result = plan.get(game_id, "ok")
        if result == "ok":
            out["uploaded"] = True
        else:
            out["upload_failed"] = True
            out["rate_limited"] = result == "429"
        return True

    return fake


def run(plan, argv):
    """Run main() against the stub; returns (exit code, printed text)."""
    del sleeps[:]
    rel.release = stub_release(plan)
    sys.argv = ["release_extension.py"] + argv
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        code = rel.main()
    return code, buf.getvalue()


def check_mod_id_sync():
    """sync_info_mod_id / set_info_mod_id against throwaway info.json files (system temp dir)."""
    import json
    import tempfile

    url = "https://www.nexusmods.com/site/mods/456"

    def make(tmp, extra=(), eol="\n"):
        lines = ["{", '  "id": "demo",', '  "gameId": 123,', *extra,
                 '  "name": "Game: Demo",', '  "version": "1.0.0"', "}"]
        path = os.path.join(tmp, "info.json")
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(eol.join(lines) + eol)
        return path

    def read(path):
        with open(path, encoding="utf-8", newline="") as f:
            return f.read()

    with tempfile.TemporaryDirectory() as tmp:
        for eol in ("\n", "\r\n"):
            path = make(tmp, eol=eol)
            before = read(path)
            assert rel.set_info_mod_id(tmp, 456, dry_run=True) == "added" and read(path) == before
            assert rel.set_info_mod_id(tmp, 456) == "added"
            after = read(path)
            assert json.loads(after)["modId"] == 456 and list(json.loads(after))[:3] == ["id", "gameId", "modId"]
            assert after.replace('  "modId": 456,' + eol, "") == before, "only the one line was added"
            assert rel.set_info_mod_id(tmp, 456) == "unchanged"
        print("set_info_mod_id ok: added after gameId, dry run writes nothing, LF and CRLF kept, rerun unchanged")

        path = make(tmp, ['  "modId": "XXX",'])
        assert rel.set_info_mod_id(tmp, 456) == "updated" and json.loads(read(path))["modId"] == 456
        make(tmp, ['  "modId": 9,'])
        assert rel.set_info_mod_id(tmp, 456) == "updated" and json.loads(read(path))["modId"] == 456
        make(tmp)
        assert rel.set_info_mod_id(tmp, "XXX") == "added" and json.loads(read(path))["modId"] == "XXX"
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write('{\n  "id": "helper",\n  "name": "Helper",\n  "version": "1.0.0"\n}\n')
        assert rel.set_info_mod_id(tmp, 7) == "added" and list(json.loads(read(path)))[:2] == ["id", "modId"]
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write('{"id": "x"}')
        assert rel.set_info_mod_id(tmp, 7) is None, "no line to anchor on: refuse, write nothing"
        assert read(path) == '{"id": "x"}'
        print("set_info_mod_id ok: placeholder and wrong number replaced, helper (no gameId) anchors on id, odd text refused")

        make(tmp)
        path = os.path.join(tmp, "info.json")
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            assert rel.sync_info_mod_id(tmp, "demo", {}, url) is True
            assert json.loads(read(path))["modId"] == 456
            assert rel.sync_info_mod_id(tmp, "demo", {"modId": 456}, url) is True
            assert rel.sync_info_mod_id(tmp, "demo", {"modId": 5}, url) is True
        text = out.getvalue()
        assert text.count("to 456 (from EXTENSION_URL)") == 1, text
        assert "WARNING" not in text, "a stamp from nothing or a rerun must not warn"

        make(tmp, ['  "modId": 5,'])
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            assert rel.sync_info_mod_id(tmp, "demo", {"modId": 5}, url) is True
        assert json.loads(read(path))["modId"] == 456 and "5 -> 456" in out.getvalue() and "WARNING" in out.getvalue()

        make(tmp)
        before = read(path)
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            assert rel.sync_info_mod_id(tmp, "demo", {}, None) is True
            assert rel.sync_info_mod_id(tmp, "demo", {"modId": "XXX"}, None) is True
            assert rel.sync_info_mod_id(tmp, "demo", {"modId": 5}, "XXX") is True
        assert read(path) == before and out.getvalue().count("WARNING") == 1, out.getvalue()
        print("sync_info_mod_id ok: stamps from EXTENSION_URL, corrects a wrong number with a warning, no URL writes nothing")


def check_contributes():
    """validate_info_contributes: the Vortex value rules for info.json "contributes"."""
    validate = rel.validate_info_contributes
    src = 'const GAME_ID = "demo";\nconst GAME_ID_B = "demob";\ncontext.registerGame(a);\ncontext.registerGame(b);\n'
    good = {"gameId": 123, "name": "Game: Demo and Demo B", "description": "Vortex support for Demo and Demo B",
            "contributes": {"games": {
        "demo": {"nexusGameId": 123, "name": "Demo"},
        "demob": {"nexusGameId": 123, "name": "Demo B"},
    }}}
    assert validate(good, src) == ([], []), validate(good, src)

    def errs(info, index_src=src, **kw):
        return validate(info, index_src, **kw)[0]

    def warns(info, index_src=src, **kw):
        return validate(info, index_src, **kw)[1]

    def game(**fields):
        return {"gameId": 123, "contributes": {"games": {"demo": fields}}}

    assert errs({"gameId": 123}), "a game with no contributes"
    assert errs({"contributes": {"games": {}}}), "an empty games object"
    assert errs({"contributes": {"games": []}}), "games as an array"
    assert errs(game(nexusGameId="XXX", name="Demo")), "a leftover placeholder"
    assert errs(game(nexusGameId=0, name="Demo")), "a zero nexusGameId"
    assert errs(game(nexusGameId=True, name="Demo")), "a boolean nexusGameId"
    assert errs(game(nexusGameId=123, name="")), "an empty name"
    assert errs(game(nexusGameId=123, name="Demo", gameUid="")), "an empty gameUid"
    assert errs({"contributes": {"games": {"tier-0-demo": {"nexusGameId": 1, "name": "x"}}}}, None), "a tier-0- key"
    assert errs({"contributes": {"games": {"typo": {"nexusGameId": 1, "name": "x"}}}}), "a key missing from index.js"

    assert any("registerGame" in w for w in warns(game(nexusGameId=123, name="Demo"))), "2 calls vs 1 key"
    assert any("matches no" in w for w in warns(game(nexusGameId=999, name="Demo"))), "gameId matches no entry"
    assert any("nexusGameId" in w for w in warns(game(name="Demo"), None)), "no nexusGameId"

    one = {"name": "Game: Demo", "description": "Vortex support for Demo",
           "contributes": {"games": {"demo": {"nexusGameId": 1, "name": "Demo"}}}}
    assert validate(one, None) == ([], []), "one game, matching name and description"
    assert errs({**one, "description": "Vortex support for DEMO"}, None), "description case differs from the name"
    assert errs({**one, "name": "Game: Demo Remastered"}, None), "name differs from the contributes name"
    assert rel.expected_info_name(["A", "B"]) == "Game: A and B"
    assert errs({**good, "description": "Vortex support for Demo"}), "multi-game description lists only the first"
    assert rel.expected_info_description(["A", "B", "C"]) == "Vortex support for A, B and C"
    assert validate({}, None, require_games=False) == ([], []), "a helper without contributes"
    enh = lambda *e: {"contributes": {"gameEnhancements": list(e)}}  # noqa: E731
    assert validate(enh({"nexusGameId": 1151}), None, require_games=False) == ([], [])
    assert validate(enh({"gameUid": "abc"}), None, require_games=False) == ([], [])
    assert errs(enh({"nexusGameId": 1151, "gameUid": "abc"}), None, require_games=False), "both targets"
    assert errs(enh({}), None, require_games=False), "no target"
    assert errs(enh({"nexusGameId": "1151"}), None, require_games=False), "a string nexusGameId"
    print("validate_info_contributes ok: placeholders, value rules, unknown keys, enhancements, count warnings")


def check_ascii_names():
    """non_ascii_names flags every non-ASCII name; sanitize_game_name folds them to ASCII."""
    vu = sys.modules["vortex_utils"]
    tm, sparkle, e_acute = chr(0x2122), chr(0x2728), chr(0xE9)
    clean = {"name": "Game: Demo", "description": "Vortex support for Demo",
             "contributes": {"games": {"demo": {"nexusGameId": 1, "name": "Demo"}}}}
    src = 'const GAME_NAME = "Demo";\nconst GAME_NAME_SHORT = "Demo";\n'
    assert rel.non_ascii_names(clean, src) == []
    assert len(rel.non_ascii_names({"name": f"Game: Demo{tm}", "description": f"x {sparkle}"})) == 2
    assert len(rel.non_ascii_names({"contributes": {"games": {"demo": {"name": f"Pok{e_acute}mon"}}}})) == 1
    assert len(rel.non_ascii_names({}, f'const GAME_NAME_SERVER = "Demo{tm} Server";\n')) == 1
    assert all(m.isascii() for m in rel.non_ascii_names({"name": f"Demo{sparkle}"}))
    assert vu.sanitize_game_name(f"ARMORED CORE{tm} VI") == "ARMORED CORE VI"
    assert vu.sanitize_game_name(f"Anime Shop Simulator {sparkle}") == "Anime Shop Simulator"
    assert vu.sanitize_game_name(f"Pok{e_acute}mon  Legends") == "Pokemon Legends"
    assert vu.sanitize_game_name(chr(0x2018) + "Q" + chr(0x2019) + " " + chr(0x2014) + " A") == "'Q' - A"
    print("non_ascii_names ok: info fields, contributes names, GAME_NAME* constants; sanitize_game_name folds to ASCII")


def main():
    rel.time.sleep = sleeps.append
    rel.SEVENZIP = sys.executable  # main() only checks that 7-Zip exists
    rel.assert_is_game_id = lambda gid: None
    rel.run_generate_explained_batch = lambda ids: (True, "")
    rel.run_generate_notes_batch = lambda ids: (True, "")
    rel.run_generate_description_batch = lambda ids: (True, "")
    rel.drop_from_unreleased_list = lambda ids, dry_run=False: None

    assert rel.is_rate_limit_error(RuntimeError(RATE_LIMIT_TEXT))
    assert not rel.is_rate_limit_error(RuntimeError("nexus_v3_post_json /uploads/multipart: HTTP 404 Not Found"))
    assert not rel.is_rate_limit_error(RuntimeError("upload failed: connection reset"))
    print("429 detector ok")

    code, text = run({}, ["a", "b", "c", "--upload"])
    assert code == 0 and sleeps == [], (code, sleeps)
    assert "python release_extension.py" not in text
    print("clean run ok: exit 0, no pause")

    code, _ = run({}, ["a", "b", "c", "--upload", "--upload-delay", "15"])
    assert code == 0 and sleeps == [15.0, 15.0], sleeps
    print("--upload-delay ok: a pause after each upload except the last")

    code, text = run({"b": "429"}, ["a", "b", "c", "d", "--upload", "--upload-delay", "15"])
    assert code == 1, code
    assert sleeps == [15.0], ("pause only after the one upload that succeeded", sleeps)
    assert "release_extension.py b c d --upload" in text, text
    assert "Skipped (stopped by rate limit, not processed): 2" in text, text
    print("429 ok: stopped at b, c and d untouched, re-run command printed, exit 1")

    code, text = run({"b": "other"}, ["a", "b", "c", "--upload"])
    assert code == 1, code
    assert "python release_extension.py" not in text and "stopped by rate limit" not in text, text
    print("non-429 failure ok: exit 1, run carried on, no re-run command")

    never_id = sorted(rel.NEVER_UPLOAD_GAMES)[0]
    called = []
    fake = stub_release({})
    rel.release = lambda gid, *a, **kw: (called.append(gid), fake(gid, *a, **kw))[1]
    sys.argv = ["release_extension.py", "a", never_id, "--upload"]
    with contextlib.redirect_stdout(io.StringIO()):
        code = rel.main()
    assert code == 1 and called == ["a"], (code, called)
    called.clear()
    sys.argv = ["release_extension.py", never_id]
    with contextlib.redirect_stdout(io.StringIO()):
        code = rel.main()
    assert called == [never_id], called
    print("never-upload ok: refused with --upload (release() not called, exit 1), zips without it")

    check_mod_id_sync()
    check_contributes()
    check_ascii_names()

    print("ALL OK")


if __name__ == "__main__":
    main()
