"""
test_release_extension.py

Offline test for the bulk-upload behaviour of release_extension.py. No Nexus call, no zip, no
7-Zip run and no file is written: release() is replaced by a stub that reports what an upload
did, and the doc generators are stubbed, so only the run loop in main() is exercised.

Covers: the 429 detector (a Cloudflare rate-limit error is recognised, other HTTP errors are
not), a clean run (exit 0, no pause), --upload-delay (one pause per successful upload, none
after the last id), a 429 mid-run (the run stops, later ids are untouched, the re-run command
names the failed id and every unprocessed one, exit 1), and a non-429 upload failure (exit 1,
the run carries on, no re-run command).

Run it after any change to the run loop, the exit code or the upload error handling in
release_extension.py.

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

    print("ALL OK")


if __name__ == "__main__":
    main()
