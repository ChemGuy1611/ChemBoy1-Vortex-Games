# games-smoke Changelog

Covers the game-level smoke run. File: `tests/games-smoke.js`, script `npm run test:games`.

## [2026-10-11]

- Added: the smoke run. It loads released `game-*` extensions under the same stubs as the template suites and runs the contract checks on each. It is not part of `npm test`; it compares against a recorded baseline so only new violations or load errors fail a game. Ids come from `CB1_GAMES`, `CB1_GAME_LIST` or, by default, every `games-*-parity.txt` list; `CB1_GAME_ROOT` points it at a scratch copy; `CB1_SMOKE_BASELINE` selects record, compare or report mode.
- Added: proof it can fail. On a scratch copy of three games with a recorded baseline, a syntax error, an installer priority of 99 and a removed `registerGame` call each turned their game red.
- Note: the first recording over the 149 games in the parity lists loaded every game and held 57 contract violations (13 installers without a FOMOD guard, 26 `mod-icons` guards, 10 mod type priorities, 3 installer priorities out of range, 2 shared priorities, 2 registration issues, 1 debug flag), recorded as the baseline, not fixed.

## [2026-10-26]

- Added: `MULTI_GAME` exceptions for extensions that register more than one game on purpose (robocoproguecity: base game and Unfinished Business; windrose: game and Dedicated Server). Their registration count is asserted exactly instead of one, and the matching `registerGame called N times` contract finding is dropped for them.
