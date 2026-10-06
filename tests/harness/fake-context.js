"use strict";

// A recording stand-in for the extension `context` and `api` Vortex passes to `main()`.
// Every `context.register*` call is stored with the phase it happened in ("main", or "once"
// when made from inside a `context.once` callback) so tests can assert on registration.

const { EventEmitter } = require("events");
const { lenient } = require("./vortex-api-stub");

// Vortex-shaped state, just deep enough for the selectors the extensions read.
function makeState({ activeGameId, discovered = {}, mods = {} } = {}) {
  return {
    settings: {
      profiles: { activeProfileId: "profile", lastActiveProfile: {} },
      gameMode: { discovered },
    },
    persistent: { profiles: { profile: { id: "profile", gameId: activeGameId } }, mods },
    session: {},
  };
}

function setActiveGame(state, gameId) {
  state.persistent.profiles.profile.gameId = gameId;
}

function makeContext(state = makeState()) {
  const calls = [];
  const onceCallbacks = [];
  const record = { notifications: [], errors: [], dialogs: [], dispatched: [], listeners: [] };
  let phase = "main";

  const listen =
    (kind) =>
    (...args) =>
      record.listeners.push({ kind, args });
  const api = lenient("api", {
    getState: () => state,
    store: {
      getState: () => state,
      dispatch: (action) => {
        record.dispatched.push(action);
        return action;
      },
    },
    events: new EventEmitter(),
    translate: (text) => text,
    // Tests install entries here (for example `ensureLoggedIn`); absent members must read undefined.
    ext: {},
    sendNotification: (notification) => {
      record.notifications.push(notification);
      return notification?.id;
    },
    showErrorNotification: (...args) => record.errors.push(args),
    showDialog: (...args) => {
      record.dialogs.push(args);
      return Promise.resolve({ action: "Cancel" });
    },
    dismissNotification: () => undefined,
    suppressNotification: () => undefined,
    on: listen("on"),
    onAsync: listen("onAsync"),
    onStateChange: listen("onStateChange"),
  });

  const recorder = (prefix) => (key) =>
    typeof key === "string" && key.startsWith("register")
      ? (...args) => calls.push({ name: prefix + key, args, phase })
      : undefined;

  const context = lenient(
    "context",
    {
      api,
      once: (callback) => onceCallbacks.push(callback),
      // Soft-dependency registrations, recorded as "optional.registerX".
      optional: lenient("context.optional", {}, recorder("optional.")),
    },
    recorder(""),
  );

  async function runOnce() {
    phase = "once";
    try {
      for (const callback of onceCallbacks) await callback();
    } finally {
      phase = "main";
    }
  }

  return { context, api, state, calls, runOnce, ...record };
}

module.exports = { makeState, setActiveGame, makeContext };
