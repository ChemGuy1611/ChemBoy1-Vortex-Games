"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const tempDirs = [];
process.on("exit", () => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
});

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cb1-tpl-"));
  tempDirs.push(dir);
  return dir;
}

// A temporary game folder holding empty files at the given relative paths.
function makeGameDir(files = []) {
  const dir = makeTempDir();
  for (const file of files) {
    const target = path.join(dir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, "");
  }
  return dir;
}

// A file list in the shape Vortex hands to installers: native separators, and every folder
// listed (with a trailing separator) ahead of its contents. Entries ending in "/" are folders.
function tree(...entries) {
  const seen = new Set();
  const list = [];
  const add = (entry) => {
    if (!seen.has(entry)) {
      seen.add(entry);
      list.push(entry);
    }
  };
  for (const entry of entries) {
    const parts = entry.split("/").filter(Boolean);
    const isFolder = entry.endsWith("/");
    parts.forEach((_, index) => {
      const last = index === parts.length - 1;
      const joined = parts.slice(0, index + 1).join(path.sep);
      add(last && !isFolder ? joined : joined + path.sep);
    });
  }
  return list;
}

module.exports = { makeTempDir, makeGameDir, tree };
