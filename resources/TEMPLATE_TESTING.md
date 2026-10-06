# Template Testing

An automated suite for the 15 `template-*` folders. It loads each template's `index.js` outside
Vortex, runs `main()` against a recording fake of the extension context, and asserts on what the
template registers and how its installers route and emit. Templates are the source of truth for
every game extension built from them, so a template regression is a regression in every game
that inherits it. The suite exists to catch that before a change is propagated.

It does not launch Vortex, touch the network, or test `game-*` folders. Whether an extension
works in the app is still checked by deploying it and loading the game.

## Running it

```text
npm test
```

Needs Node 22 or newer (`node:test` with glob arguments) and the repo's dev dependencies
(`npm install`). No extra test dependency is used. The script passes a glob, because
`node --test <directory>` fails on current Node versions.

Run a single file with `node --test tests/templates/basic.test.js`, or one template's contract
checks with `node --test --test-name-pattern="template-ue4-5" tests/contract.test.js`.

The script also passes `--test-timeout=30000`, so a test that hangs on a promise that never
settles fails instead of stalling the run.

## Layout

```text
tests/
  harness/
    stub-modules.js      require() hook for Vortex-only/native modules, plus the network block
    vortex-api-stub.js   stand-in for the vortex-api package
    fake-context.js      recording extension context and api, Vortex-shaped state
    load-extension.js    loadExtension(dir, { transform, state }) and template discovery
    transforms.js        source rewrites (setConst, all) for flipping toggles in memory
    fixtures.js          temporary game folders, installer-style file lists
    helpers.js           routing, download, shell and registry helpers the suites share
  contract-checks.js     the checks every template must pass
  contract-allowlist.js  known per-template exceptions, each with a reason
  contract.test.js       runs the checks on every template, plus mutation self-checks
  templates/<name>.test.js   behavior tests for one template
  changelogs/<suite>.md  one changelog per suite, plus harness.md and contract.md
```

The tests live in the repo root rather than inside a template folder on purpose. The scaffold
and deploy scripts copy template and extension folders, and `tests/` is outside both. Nothing
in the suite writes to a template folder.

## How a template is loaded

The `vortex-api` npm package is types only, so an extension's `require("vortex-api")` would
fail under plain Node. `harness/stub-modules.js` hooks `require()` and substitutes stubs for
`vortex-api`, `winapi-bindings`, `exe-version` and `vortex-parse-ini`. The hook stays installed
for the whole process because extensions also require modules lazily, inside installers.

`vortex-api-stub.js` implements the pieces extensions use while loading and inside installers
(`util.getVortexPath`, `util.GameStoreHelper`, `selectors`, `actions`, `fs`, `log` and the error
classes). Any other member resolves to a no-op and is recorded, and the contract suite prints
the list as a diagnostic. A new entry in that list means the stub needs extending, so a gap is
visible instead of passing silently.

`loadExtension(dir)` compiles the template, calls `main()` with the fake context, then runs the
callbacks given to `context.once`. It returns the registered game, installers, mod types and
`mod-icons` actions, plus every recorded `register*` call with the phase it happened in. The
fake `api` records notifications, dialogs, dispatched actions and event listeners.

Tests can pass `transform` to rewrite the source before it is compiled. `setConst("hasLoader",
"true")` flips a feature toggle for that load only, and throws if the declaration no longer
exists, so renaming a toggle fails the test instead of silently passing.

Modules bundled inside the extension folder (`downloader.js`, `*_browser.js`) are loaded fresh
for every `loadExtension`, because they keep module-level state. `loadExtension(dir, { bundled })`
replaces one of them with a stand-in, for example `{ "downloader.js": fake }`, which is how a
suite checks what a template hands to a large shared module without running it.

Network access is blocked: `fetch`, `http.request/get` and `https.request/get` throw, and every
attempt is recorded. Each test file asserts that no attempt happened, which also catches an
extension that swallows the exception. A test that needs a remote host answers it explicitly
with `withFetch(handler, run)` (see the helper table), which puts the block back afterwards.

## Contract checks

`contract.test.js` discovers every `template-*` folder, so a new template is held to the same
contract without editing the test. Each check returns a list of violations.

| Check                       | What it asserts                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| `game-registration`         | Exactly one `registerGame`; required fields present; `queryPath` or `queryArgs` for discovery             |
| `modtype-priority`          | Mod type priorities within 25 to 75 plus one per extra spec type (`low` adds its array index); ids unique |
| `installer-priority-range`  | Installer priorities within 25-49                                                                         |
| `installer-priority-unique` | No two installers share a priority                                                                        |
| `installer-fallback-last`   | A `-fallback` installer is priority 49 and registered last                                                |
| `installer-shape`           | `testSupported` returns `{ supported: boolean, requiredFiles: array }`; `install` is a function          |
| `installer-gameid`          | No installer accepts a mod for another game                                                               |
| `installer-fomod`           | No installer accepts a FOMOD package (`fomod/ModuleConfig.xml`)                                           |
| `register-phase`            | No `register*` call inside `context.once`                                                                 |
| `mod-icons-guard`           | Every `mod-icons` action is priority 300, hidden unless the active game is the template's game           |
| `query-path`                | `queryPath` resolves the store lookup result and does not throw synchronously when the lookup fails      |
| `executable-per-store`      | `executable()` returns a string for Steam, Epic, GOG and Xbox marker files and for an empty folder        |
| `debug-off`                 | The `debug` toggle ships as `false`                                                                       |

The game-id and FOMOD checks find a file set each installer accepts by trying a pool of
generic probes (the scaffold placeholder `XXX`, common extensions and folders). When no probe
reaches an installer, the FOMOD check falls back to confirming the guard exists in its source.
Per-template suites cover installers the probes do not reach.

### Known exceptions

`contract-allowlist.js` maps a template and a check to a reason string. An entry is itself
asserted: the check must still fail for that template, so fixing the template turns the suite
red until the entry is removed. Current entries are all reviewed and accepted:

- Installers that match one exact marker file (an executable or DLL name) omit the FOMOD guard:
  `cobraengineACSE` (ACSE, ACSE mod, localised, ovldata), `reloaded2` (manager), `snowdropengine`
  (mod loader, data subfolder). A FOMOD package never contains the marker file, so these tests
  are false for it regardless.
- `cobraengineACSE` registers its save installer and its fallback at 49, and `shinryu` registers
  its mod and root installers at 27.
- `unity-umm` registers two mod types at 8 and 10 and its root installer at 8, to run ahead of
  helper-extension handlers.

### Mutation self-checks

A check that cannot fail is worthless, so `contract.test.js` also breaks a copy of
`template-basic` in memory four ways (FOMOD guard removed, game-id check removed, an installer
priority set out of range, registration moved into `context.once`) and requires the matching
check to report it. The file on disk is never modified.

## Per-template suites

`tests/templates/<name>.test.js` covers what is specific to one template, built from that
template's own constants:

- a routing matrix: file lists mapped to the set of installer ids that accept them, which
  catches installer collisions;
- install output: the `copy` and `setmodtype` instructions a winning installer emits;
- toggle gating: reloading with a toggle flipped and asserting the registered set changes;
- template mechanics: version resolution, launcher hand-off, toolbar actions, download flow.

`basic.test.js` is the reference for the pattern. Tests are read-only on templates: a failing
check is either a documented exception (add an allowlist entry with a reason) or a finding to
fix in the template through the normal propagation path.

Suites exist for `basic`, `snowdropengine`, `shinryu`, `frostbite`, `reloaded2`,
`cobraengine-acse`, `tfcinstaller-ue2-3`, `unity-umm`, `farcry`, `godot`, `rpgmaker` and
`anvilengine`. The rest are covered by the contract checks only until their own suite is written.

A template with many toggles (`anvilengine` has nineteen) is tested three ways: the default
load, one load per toggle with the registration it adds, and a load with every feature on, which
also runs the contract checks, because installer priorities and mod type counts only collide when
the optional features are present together.

A suite can reach a template's private helpers (functions the template does not export) with a
source transform that appends an export, for example `src + "\nmodule.exports.internals = { fn };"`.
The rpgmaker suite does this for its parameter parsing helpers.

### Shared helpers

`harness/helpers.js` holds what several suites repeat:

| Helper                               | Purpose                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `idsOf`, `summary`                   | Compact views of the registered installers and mod types (ids, `[id, priority]`)                                         |
| `installerOf(ext, id)`               | Look up one registered installer                                                                                         |
| `supportedBy(ext, files)`            | Ids of every installer whose `testSupported` accepts a file list                                                         |
| `answerDownloads(ext)`               | Answers `start-download` and `start-install-download` like Vortex and records them                                       |
| `stubShell()`                        | Installs a `window.api.shell` that records what it was asked to open                                                     |
| `withWinapi(overrides, run)`         | Runs a test with registry or other `winapi-bindings` members replaced                                                    |
| `withFetch(handler, run)`, `reply()` | Answer `fetch` requests the way a remote host would, then restore the network block; `reply()` builds a minimal response |
| `waitFor(check)`, `settle()`         | Wait for fire-and-forget work such as toolbar actions, or give it time to not happen                                     |

### Known-gap tests

When a template has a real defect that is not being fixed in the same change, the suite pins
the current behavior in a test named `known gap: ...` instead of skipping it or hiding it in
the allowlist. The test asserts the faulty behavior, so it turns red when the template is fixed
and the test is then rewritten to assert the correct behavior. These tests are a to-do list,
not a statement that the behavior is acceptable.

## Changelogs

Every suite has its own changelog in `tests/changelogs/<suite>.md` (named like the suite file:
`farcry.md`, `unity-umm.md`), and the harness and the contract suite have `harness.md` and
`contract.md`. The format matches `resources/template-changelogs/`: newest entry first, dated
`## [YYYY-MM-DD]`, with `Added`, `Changed`, `Fixed` or `Note` bullets in plain prose.

Log an entry in the same change when a suite is added, when a template change makes a suite
change (the entry says what changed in the template and which tests follow it), when a test
is fixed for a reason other than a template change (a flaky race, a wrong expectation), when a
`known gap` test is added or flipped, and when the harness changes. The changelog records why
the suite changed, so a red run after a template change can be traced to the change that
expected it.

## Proving a suite can fail

A green suite only means something if breaking the template turns it red. For each per-template
suite, copy the template and `template-basic` (the contract suite needs it) into a scratch
folder outside the repo, point the suite at the copy with the `CB1_TEMPLATE_ROOT` environment
variable, and apply one deliberate break at a time: change an installer priority, flip a
toggle, remove a guard, rename a constant. Run the suite after each break; it must fail. Run it
once on the unbroken copy first, because a copy that fails for an unrelated reason makes every
mutant look killed. A break that no test notices is either a missing test or a change that has
no observable effect, and each survivor should be judged which. The real template files are
never modified.

## Adding a template or a check

- New template folder: nothing to do. The contract suite picks it up. Add
  `tests/templates/<name>.test.js` for its own behavior.
- New contract check: add a function to `contract-checks.js` returning violation strings. If it
  exercises a rule that can be broken in `template-basic`, add a mutant for it.
- A stub gap: extend `vortex-api-stub.js` (or the fake context) and re-run the whole suite,
  because every earlier result depended on the old stub.

## See also

`TEMPLATES_OVERVIEW.md` (the template set, shared anatomy and the priority bands the checks
encode). `INSTALLER_SYSTEM.md` (the `testSupported`/`install` contract and priority ordering the
installer checks assert).
