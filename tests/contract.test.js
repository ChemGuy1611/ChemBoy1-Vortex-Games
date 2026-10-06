"use strict";

const assert = require("node:assert/strict");
const { before, describe, it } = require("node:test");
const { checks } = require("./contract-checks");
const allowlist = require("./contract-allowlist");
const { listTemplates, loadExtension, templateDir } = require("./harness/load-extension");

// Every template-* folder is picked up automatically, so a new template is held to the
// same contract without touching this file.
for (const name of listTemplates()) {
  describe(name, () => {
    let ext;

    before(async () => {
      ext = await loadExtension(templateDir(name));
    });

    it("loads and registers under the stubs", (t) => {
      assert.equal(typeof ext.exports.default, "function", "module.exports.default must be main()");
      if (ext.unmocked.length)
        t.diagnostic(`unmocked vortex-api members: ${ext.unmocked.join(", ")}`);
    });

    for (const [checkName, check] of Object.entries(checks)) {
      it(checkName, async () => {
        const violations = await check(ext);
        const reason = allowlist[name]?.[checkName];
        if (reason) {
          // A known oddity must stay true; if it stops failing, the entry is stale.
          assert.ok(
            violations.length > 0,
            `allowlisted (${reason}) but now passes; remove the entry`,
          );
        } else {
          assert.deepEqual(violations, []);
        }
      });
    }
  });
}

// Each mutant breaks one rule in a scratch copy of template-basic (source rewritten in
// memory, file untouched) and must turn the matching check red. This proves the checks can
// actually fail.
describe("mutation self-checks (template-basic)", () => {
  const mutants = [
    {
      name: "FOMOD guard removed",
      check: "installer-fomod",
      transform: (source) => source.replaceAll('"moduleconfig.xml"', '"never-matches.xml"'),
    },
    {
      name: "game id check removed",
      check: "installer-gameid",
      transform: (source) => source.replaceAll("gameId === spec.game.id", "true"),
    },
    {
      name: "installer priority out of range",
      check: "installer-priority-range",
      transform: (source) =>
        source.replace("registerInstaller(ROOT_ID, 27,", "registerInstaller(ROOT_ID, 99,"),
    },
    {
      name: "registration moved into context.once",
      check: "register-phase",
      transform: (source) =>
        source.replace(
          /applyGame\(context, spec\);(\s*)context\.once\(\(\) => \{/,
          "context.once(() => {$1applyGame(context, spec);",
        ),
    },
  ];

  for (const mutant of mutants) {
    it(`${mutant.name} fails ${mutant.check}`, async () => {
      const original = await loadExtension(templateDir("template-basic"));
      assert.deepEqual(await checks[mutant.check](original), [], "check must pass unmutated");

      const mutated = await loadExtension(templateDir("template-basic"), {
        transform: mutant.transform,
      });
      assert.notEqual(mutated.source, original.source, "transform did not change the source");
      assert.ok((await checks[mutant.check](mutated)).length > 0, "mutant was not detected");
    });
  }
});
