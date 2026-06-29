# Vortex Profiles (runtime)

How the app represents a "playthrough" and how it switches between them. A profile is the unit
that owns **which mods are enabled**, the **load order**, and (for Gamebryo) **plugin enablement**
— so a profile captures a full setup. Registering custom profile *features* is the authoring view:
see `SETTINGS_REDUCER.md` and `IProfileFeature`.

Driver: the `profile_management` core extension (`index.ts`, `sync.ts`, `util/manage.ts`).

## What a profile is

`IProfile` (`profile_management/types/IProfile.ts`), stored at `state.persistent.profiles[id]`:

| Field | Meaning |
| --- | --- |
| `id` | Profile id |
| `gameId` | Which game this profile is for |
| `name` | Display name |
| `modState` | `{ [modId]: { enabled, enabledTime } }` — **per-profile** mod enablement |
| `lastActivated` | Timestamp |
| `pendingRemove?` | Marked for deletion |
| `features?` | `{ [featureId]: value }` — extension-contributed profile features |

Mod enablement lives in `modState`, **per profile, not global**. Switching profiles changes which
mods deploy. The same is true of load order and Gamebryo plugin state, which are keyed by profile.

## Two state keys: requested vs active

| Path | Role |
| --- | --- |
| `settings.profiles.nextProfileId` | The profile a switch was **requested** to |
| `settings.profiles.activeProfileId` | The profile actually **active** now |

`setNextProfile(gameId, profileId)` requests a switch (writing `nextProfileId`). A watcher on
`nextProfileId` runs the switch flow; on success `confirmProfile` calls `setCurrentProfile(...)`,
which updates `activeProfileId`. A watcher on `activeProfileId` then emits **`profile-did-change`**
— and (in `gamemode_management`) drives game activation (`VORTEX_GAME_LIFECYCLE.md`). So
`activeProfileId` changing does double duty: profile-did-change **and** gamemode activation.

## Switch flow

Triggered by a change to `nextProfileId` (`onStateChange(['settings','profiles','nextProfileId'])`):

1. **Wait** for any in-flight switch to finish (`finishProfileSwitchPromise`). Bail if a newer
   switch superseded this one or if it's just resetting to the current profile.
2. **Validate** the target: the game extension must still be installed (else "Game no longer
   supported") and the game must still be discovered (else "Game is no longer discoverable") —
   both abort with `ProcessCanceled`.
3. Arm a new `finishProfileSwitchPromise` that waits for an **external** completion signal
   (`onFinishProfileSwitch`) — the next switch is blocked until then; error handlers must cancel it.
4. `refreshProfile(oldProfile, 'import')` — save the **old** profile's current files back into its
   profile store (`syncToProfile`).
5. **`profile-will-change`** (`current`, `enqueue`) — listeners call `enqueue(cb)` to add async
   work to a serial `queue` that is awaited before continuing (errors are logged, not fatal).
6. If switching to **no** profile (`current === undefined`): `confirmProfile(undefined)` and stop.
7. Otherwise `sanitizeProfile`, then (wrapped in a tracked activity `profile.switch`):
   `refreshProfile(profile, 'export')` (write the **new** profile's stored files out via
   `syncFromProfile`) → `deploy(prev)` → `deploy(current)` → `confirmProfile(gameId, current)`.
8. `confirmProfile` → `setCurrentProfile` → `activeProfileId` changes → `profile-did-change` +
   game activation.

## Profile sync (`sync.ts`)

Some game files are profile-specific (saves, INI, `plugins.txt`, load-order files). `refreshProfile`
moves them between the live game location and the per-profile store, atomically:

- **`syncToProfile(profilePath, sourceFiles, onError)`** ("import") — copy the live files **into**
  the profile folder (`copyFileAtomic`). Missing file (`EBADF`) is treated as empty, not an error.
- **`syncFromProfile(profilePath, sourceFiles, onError)`** ("export") — copy the profile's stored
  files **back out** to the game locations. `EPERM` → "write protected" (non-reportable);
  `ENOENT` ignored.

## Deploy on switch

The switch deploys the **previous** profile (to flush its enabled set) and then the **next**
profile, via the same `will-deploy`/`did-deploy` pipeline (`VORTEX_DEPLOYMENT.md`). `mod-enabled` /
`mods-enabled` on the active profile also schedule a (debounced) deploy.

## Profile features

Extensions can attach extra per-profile data via profile features (`IProfileFeature`), surfaced in
the profile editor and stored under `profile.features`. Registration: `SETTINGS_REDUCER.md`.

## Events (runtime)

| Event | Direction | Purpose |
| --- | --- | --- |
| `profile-will-change` (profileId, enqueue) | emit | Pre-switch; listeners enqueue async work |
| `profile-did-change` (profileId) | emit | Switch committed |
| `activate-game` / `setNextProfile` (action) | — | Request a switch |

## Gotchas

- After `profile-will-change`, the flow **waits for an external `onFinishProfileSwitch` signal**;
  if a handler errors it must cancel that promise or the next switch is permanently blocked.
- A switch is cancellable: if `nextProfileId` changes again while waiting, the older switch bails.
- Deleting the target profile mid-deploy aborts with a (pointed) `ProcessCanceled`.
- Because `activeProfileId` drives both profile-did-change and game activation, the two are
  inseparable — there is no "switch profile without re-activating the game".

## See also

Runtime siblings: `VORTEX_GAME_LIFECYCLE.md`, `VORTEX_DEPLOYMENT.md`, `VORTEX_LOAD_ORDER.md`,
`VORTEX_EVENT_BUS.md`. Overview: `VORTEX_APP.md`. Authoring: `SETTINGS_REDUCER.md`. Memory:
`reference_vortex_profiles`.
