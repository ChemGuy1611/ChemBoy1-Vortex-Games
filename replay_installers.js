/**
 * replay_installers.js -- Run real archive listings through a game extension's installers, without
 * Vortex, and report which installer claims each archive and where its files would land.
 *
 * The extension is loaded under the template test harness (tests/harness), so its registered
 * installers are the real ones. For each archive the installers are tried in priority order, the
 * first whose testSupported accepts the file list runs its install function, and the copy
 * instructions and mod type it returns are printed. Nothing is installed or written.
 *
 * Input is a JSON list of {name, filename?, files: [archive entry paths, "/"-separated]} - the
 * shape modio_listings.py writes. Entries with "files": null are skipped.
 *
 * Usage:
 *   node replay_installers.js GAME_ID LISTINGS.json [--answer cancel|all] [--show N]
 *   node replay_installers.js stalker2heartofchornobyl modio_listings_stalker2.json
 *   node replay_installers.js abioticfactor abiotic.json --answer all --show 10
 *
 * Arguments:
 *   GAME_ID          extension id, with or without the "game-" prefix
 *   LISTINGS.json    archive listings (see above)
 *   --answer         how an installer's dialog is answered: "cancel" (default, as the harness does)
 *                    or "all" (the "Install All" button of a multi-file chooser)
 *   --show N         copy instructions printed per archive (default 4)
 *
 * Output:
 *   One block per archive: claiming installer and priority, mod type, files copied / total, any
 *   dialog the installer raised, duplicate destinations, and the first N source => destination
 *   lines. Then a tally per installer. An installer that throws, or has not finished after 5 seconds
 *   (usually real staging or a prompt the harness cannot answer), prints as "stopped" and the run
 *   carries on. An installer whose testSupported throws is reported the same way ("testSupported
 *   threw") and the next installer is tried. Exit code 1 when the extension or the listings cannot
 *   be read.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { loadExtension } = require("./tests/harness/load-extension.js");

const REPO_ROOT = __dirname;
const INSTALL_TIMEOUT_MS = 5000;

function parseArgs(argv) {
  const args = { answer: "cancel", show: 4, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--answer") args.answer = argv[++i];
    else if (argv[i] === "--show") args.show = Number(argv[++i]);
    else args.positional.push(argv[i]);
  }
  return args;
}

//Vortex hands an installer relative paths with the platform separator, plus one entry per
//directory ending in a separator
function vortexFileList(names) {
  const out = new Set();
  for (const name of names) {
    const parts = name.split("/").filter(Boolean);
    for (let i = 1; i < parts.length; i++) out.add(parts.slice(0, i).join(path.sep) + path.sep);
    if (!name.endsWith("/")) out.add(parts.join(path.sep));
  }
  return [...out];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [gameId, listingsPath] = args.positional;
  if (!gameId || !listingsPath || !["cancel", "all"].includes(args.answer)) {
    console.error(
      "Usage: node replay_installers.js GAME_ID LISTINGS.json [--answer cancel|all] [--show N]",
    );
    process.exit(1);
  }
  const folder = path.join(REPO_ROOT, gameId.startsWith("game-") ? gameId : `game-${gameId}`);
  const listings = JSON.parse(fs.readFileSync(listingsPath, "utf8"));
  const ext = await loadExtension(folder);

  //Record every dialog an installer raises and answer it as asked
  let dialogs = [];
  ext.api.showDialog = (type, title) => {
    dialogs.push(title);
    return Promise.resolve(
      args.answer === "all"
        ? { action: "Install All", input: {} }
        : { action: "Cancel", input: {} },
    );
  };

  const installers = [...ext.installers].sort((a, b) => a.priority - b.priority);
  const tally = {};
  const count = (key) => (tally[key] = (tally[key] || 0) + 1);

  for (const entry of listings) {
    if (!entry.files) {
      console.log(`-- ${entry.name}: no listing, skipped`);
      count("(no listing)");
      continue;
    }
    const files = vortexFileList(entry.files);
    const total = files.filter((f) => !f.endsWith(path.sep)).length;
    let claimed = null;
    for (const inst of installers) {
      let supported = false;
      try {
        supported = (await inst.testSupported(files, ext.game.id)).supported;
      } catch (err) {
        //One test throwing on an odd listing must not end the run; the next installer still gets its turn
        console.log(
          `!! ${entry.name}: ${inst.id} (${inst.priority}) testSupported threw: ${err.message}`,
        );
        count(`${inst.id} (test threw)`);
      }
      if (supported) {
        claimed = inst;
        break;
      }
    }
    if (claimed === null) {
      console.log(`!! ${entry.name}: no installer claims it`);
      count("(unclaimed)");
      continue;
    }
    dialogs = [];
    const staging = path.join(REPO_ROOT, "nonexistent-staging");
    let result;
    let timer;
    try {
      result = await Promise.race([
        claimed.install(
          files,
          staging,
          ext.game.id,
          () => undefined,
          undefined,
          true,
          entry.filename,
        ),
        //An install waiting on something the harness never answers would otherwise drain Node's
        //event loop and end the whole run with exit code 0 and no tally
        new Promise((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error("never finished: it waits on something the harness does not answer"),
              ),
            INSTALL_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (err) {
      const asked = dialogs.length ? ` after dialog "${dialogs.join('", "')}"` : "";
      console.log(
        `!! ${entry.name}: ${claimed.id} (${claimed.priority}) stopped${asked}: ${err.message}`,
      );
      count(`${claimed.id} (stopped)`);
      continue;
    } finally {
      clearTimeout(timer);
    }
    const copies = result.instructions.filter((i) => i.type === "copy");
    const modType = result.instructions.find((i) => i.type === "setmodtype")?.value || "(none)";
    const dests = copies.map((c) => c.destination.toLowerCase());
    const dupes = [...new Set(dests.filter((d, i) => dests.indexOf(d) !== i))];
    const notes = [
      dialogs.length ? `dialog "${dialogs.join('", "')}"` : "",
      dupes.length ? `DUPLICATE DESTINATIONS: ${dupes.join(", ")}` : "",
    ].filter(Boolean);
    console.log(
      `== ${entry.name} | ${claimed.id} (${claimed.priority}) | type ${modType} | ${copies.length}/${total} files` +
        (notes.length ? ` | ${notes.join(" | ")}` : ""),
    );
    for (const c of copies.slice(0, args.show))
      console.log(`     ${c.source}  =>  ${c.destination}`);
    count(claimed.id);
  }

  console.log("\nTally:");
  for (const [key, n] of Object.entries(tally).sort((a, b) => b[1] - a[1]))
    console.log(`  ${n}  ${key}`);
}

main().catch((err) => {
  console.error(`Failed: ${err.message}`);
  process.exit(1);
});
