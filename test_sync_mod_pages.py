"""
test_sync_mod_pages.py

Offline test for sync_mod_pages.py and vortex_utils.nexus_v3_patch_json. No Nexus API call is
made: a local fake server answers the PATCH and the v1 page read is replaced by a stub. The
repo, the backup folder and the API are all temporary or fake, so nothing in the working tree
is touched.

Covers: the summary builder, the v1 -> BBCode conversion, the report mode, the first-push gate
(no PATCH, no files), --dry-run (no files), a 422 (backup kept, no state), a backup that does
not read back (aborts before the PATCH), a forced first push (PATCH body, state, pushed body),
an unchanged file (skipped although v1 is stale), a second push (no --force needed, backup
holds the last-pushed body), backup names never overwriting each other, and --pull / --write.

Run it after any change to sync_mod_pages.py, nexus_v3_patch_json, or the description format
the summary builder reads (generate_notes.js Supported Versions list).

Usage:
    python test_sync_mod_pages.py

Exit code: 0 when every check passes (prints ALL OK), non-zero on the first failed check.
"""

import http.server
import json
import os
import sys
import tempfile
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import vortex_utils as vu  # noqa: E402
import sync_mod_pages as smp  # noqa: E402

REPO_BODY = """This extension adds Fake modding support to Vortex Mod Manager.

[b]✅ Supported Versions:[/b]
[list]
[*]Steam[/*]
[*]Xbox (Game Pass)[/*]
[*]Other versions may need to select the installation location manually.[/*]
[/list]
[b]Mod Installation Notes:[/b]
[list]
[*]Installs stuff.[/*]
[/list]
"""
LIVE_V1 = {"uid": 4242, "summary": "old summary", "description": "Old text\n<br />second line\n<br />\n<br />end"}


class FakeApi:
    """Local PATCH endpoint. Records every request; answers 204, or fail_status when set."""

    def __init__(self):
        self.seen = []
        self.fail_status = None
        outer = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_PATCH(self):
                length = int(self.headers.get("Content-Length", 0))
                outer.seen.append({"path": self.path, "body": json.loads(self.rfile.read(length).decode("utf-8"))})
                if outer.fail_status:
                    payload = json.dumps({"error": "description must not be blank"}).encode()
                    self.send_response(outer.fail_status, "Unprocessable Entity")
                    self.send_header("Content-Length", str(len(payload)))
                    self.end_headers()
                    self.wfile.write(payload)
                else:
                    self.send_response(204)
                    self.end_headers()

            def log_message(self, *args):
                pass

        self.server = http.server.HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.url = "http://127.0.0.1:%d" % self.server.server_address[1]

    def close(self):
        self.server.shutdown()


def check_helpers():
    assert smp.build_summary(REPO_BODY) == (
        "This extension adds Fake modding support to Vortex Mod Manager. Steam and Game Pass versions supported."
    )
    three = REPO_BODY.replace("[*]Steam[/*]", "[*]Steam[/*]\n[*]GOG[/*]")
    assert smp.build_summary(three).endswith("Steam, GOG and Game Pass versions supported."), smp.build_summary(three)
    one = REPO_BODY.replace("[*]Xbox (Game Pass)[/*]\n", "")
    assert smp.build_summary(one).endswith("Steam version supported."), smp.build_summary(one)
    assert smp.build_summary("Just a line.\n") == "Just a line."
    for bad in ("x" * 400, "\n\n"):
        try:
            smp.build_summary(bad)
        except ValueError:
            continue
        raise AssertionError("an out-of-range summary was accepted")
    assert smp.v1_to_bbcode("a\n<br />b\r\n<br />\n<br />c") == "a\nb\n\nc"
    # no-break spaces survive the conversion (the live pages carry some)
    assert smp.v1_to_bbcode("x y\n<br />z") == "x y\nz"
    print("helpers ok")


def main():
    api = FakeApi()
    vu._NEXUS_V3 = api.url
    seen = api.seen
    with tempfile.TemporaryDirectory(prefix="smp_") as tmp:
        root = os.path.join(tmp, "repo")
        backups = os.path.join(tmp, "backups")
        os.makedirs(os.path.join(root, "game-fake"))
        os.makedirs(os.path.join(root, "game-nourl"))
        smp.REPO_ROOT = root

        def write_repo(text):
            with open(os.path.join(root, "game-fake", "DESCRIPTION.bbcode"), "w", encoding="utf-8", newline="\n") as f:
                f.write(text)

        vu.write_text_atomic(
            os.path.join(root, "game-fake", "index.js"),
            'const EXTENSION_URL = "https://www.nexusmods.com/site/mods/9999";\n',
        )
        vu.write_text_atomic(os.path.join(root, "game-nourl", "index.js"), 'const EXTENSION_URL = "XXX";\n')
        write_repo(REPO_BODY)

        smp.get_api_key = lambda name: "KEY"
        smp.nexus_get_mod = lambda domain, mod_id, key: (dict(LIVE_V1, domain_name=domain, mod_id=mod_id), "1999")

        def run(mode, ids=("fake",), **kw):
            return smp.run_pages(list(ids), mode=mode, backup_dir=backups, **kw)

        check_helpers()

        # report
        assert run("report")[0]["status"] == "differs"
        assert run("report", ids=("nourl",))[0]["status"] == "no-url"
        print("report ok")

        # first-push gate: never pushed, live differs, no --force
        r = run("push")[0]
        assert r["status"] == "gated" and not seen, (r, seen)
        assert not os.path.exists(backups), "the gate must not create backups"
        print("gate ok: skipped, no PATCH, nothing written")

        # dry run, even with --force
        r = run("push", force=True, dry_run=True)[0]
        assert r["status"] == "would-push" and not seen and not os.path.exists(backups), (r, seen)
        print("dry-run ok")

        # 422: error, backup kept, no state recorded
        api.fail_status = 422
        r = run("push", force=True)[0]
        assert r["status"] == "error" and "422" in r["msg"], r
        assert len(seen) == 1
        assert not os.path.exists(os.path.join(backups, smp.STATE_FILE)), "a failed push must not record state"
        assert len([n for n in os.listdir(os.path.join(backups, "fake")) if n.endswith("_before.json")]) == 1
        print("422 ok: error, backup kept, no state")
        api.fail_status = None
        seen.clear()

        # a backup that does not read back aborts before the PATCH
        real_write = smp.write_json_atomic

        def corrupt(path, data, **kw):
            if path.endswith("_before.json"):
                with open(path, "w", encoding="utf-8") as f:
                    f.write("{ not json")
            else:
                real_write(path, data, **kw)

        def truncate(path, data, **kw):
            # valid JSON that is not what was written: only the content comparison can catch this
            if path.endswith("_before.json"):
                real_write(path, dict(data, description=data["description"][:-5]), **kw)
            else:
                real_write(path, data, **kw)

        for label, writer in (("unparseable", corrupt), ("different content", truncate)):
            smp.write_json_atomic = writer
            try:
                r = run("push", force=True)[0]
            finally:
                smp.write_json_atomic = real_write
            assert r["status"] == "error" and "backup" in r["msg"] and not seen, (label, r, seen)
        print("backup read-back failure ok: unparseable and altered backups both abort before PATCH")

        # forced first push
        r = run("push", force=True)[0]
        assert r["status"] == "pushed", r
        assert len(seen) == 1 and seen[0]["path"] == "/mods/4242", seen
        sent = seen[0]["body"]
        assert sent["description"] == REPO_BODY.strip(), sent
        assert sent["summary"].endswith("Steam and Game Pass versions supported."), sent
        state = json.load(open(os.path.join(backups, smp.STATE_FILE), encoding="utf-8"))
        assert list(state) == ["4242"] and state["4242"]["id"] == "fake", state
        body_file = os.path.join(backups, *state["4242"]["body_file"].split("/"))
        assert open(body_file, encoding="utf-8").read().strip() == REPO_BODY.strip()
        print("force push ok: PATCH /mods/4242 with summary + description, state and pushed body saved")
        seen.clear()

        # unchanged file: v1 is stale (the stub keeps serving LIVE_V1) but the state says it was pushed
        r = run("push")[0]
        assert r["status"] == "unchanged" and not seen, (r, seen)
        print("state skip ok: unchanged, no PATCH although v1 is stale")

        # changed file: no --force needed; the backup holds the LAST-PUSHED body, not the stale v1 text
        write_repo(REPO_BODY + "[*]extra line[/*]\n")
        r = run("push")[0]
        assert r["status"] == "pushed" and len(seen) == 1, (r, seen)
        names = [n for n in os.listdir(os.path.join(backups, "fake")) if n.endswith("_before.json")]
        assert len(names) == len(set(names)) and len(names) >= 3, ("backups must not overwrite each other", names)
        newest = max(names, key=lambda n: os.path.getmtime(os.path.join(backups, "fake", n)))
        rec = json.load(open(os.path.join(backups, "fake", newest), encoding="utf-8"))
        assert rec["source"] == "last-pushed" and rec["description"].strip() == REPO_BODY.strip(), rec["source"]
        assert rec["v1_response"]["description"] == LIVE_V1["description"], "the raw v1 body is kept for the record"
        print("second push ok: no --force, backup source=last-pushed holds the previous push")
        seen.clear()

        # pull + --write (state removed so the pull reads v1)
        os.remove(os.path.join(backups, smp.STATE_FILE))
        live_text = smp._norm(smp.v1_to_bbcode(LIVE_V1["description"]))
        assert run("pull", write=True)[0]["status"] == "pulled"
        files = os.listdir(os.path.join(backups, "fake"))
        assert any(n.endswith("_live.bbcode") for n in files) and any(n.endswith("_live.diff") for n in files)
        repo_now = open(os.path.join(root, "game-fake", "DESCRIPTION.bbcode"), encoding="utf-8").read()
        assert repo_now.strip() == live_text, "pull --write must write the converted live text"
        print("pull ok: live text + diff saved, --write overwrote the repo file")

        # pull --dry-run saves nothing
        count = len(os.listdir(os.path.join(backups, "fake")))
        run("pull", dry_run=True)
        assert len(os.listdir(os.path.join(backups, "fake"))) == count
        print("pull dry-run ok")

    api.close()
    print("ALL OK")


if __name__ == "__main__":
    main()
