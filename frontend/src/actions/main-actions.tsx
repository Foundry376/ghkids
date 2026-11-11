import { Dispatch } from "redux";
import * as types from "../constants/action-types";
import { makeRequest } from "../helpers/api";
import { commitLocalDraft } from "../helpers/local-worlds";
import { postAuthPath } from "../helpers/post-auth-path";
import { legacyPassword } from "../helpers/session-storage";
import { Game, World } from "../types";

// unfortunately they're numbers, but I wish they were strings so making a type
type ID = number;

export type User = { id: ID; username: string; email: string };
export type Profile = { id: ID; username: string };

export function logout() {
  return async function (dispatch: Dispatch<MainActions>) {
    try {
      await makeRequest("/sessions/current", { method: "DELETE" });
    } catch {
      // Their login is in a cookie only the server can end, so looking signed
      // out here would leave it working on what may be a shared computer.
      window.alert("We couldn't sign you out. Check your internet connection and try again.");
      return;
    }
    dispatch({
      type: types.SET_ME,
      me: null,
    });
    window.location.href = "/";
  };
}

/**
 * A browser signed in before sessions existed has its password in a cookie.
 * Trade it for a session so nobody is signed out by the switch. The response
 * replaces that cookie, removing the password. If the request fails, the
 * cookie stays and we try again on the next page load.
 */
export function upgradeLegacySession() {
  return async function (dispatch: Dispatch<MainActions>, getState: () => { me: User | null }) {
    const { me } = getState();
    const password = legacyPassword();
    if (!me || !password) {
      return;
    }
    try {
      await makeRequest("/sessions", {
        method: "POST",
        headers: { Authorization: `Basic ${btoa(me.username + ":" + password)}` },
      });
    } catch (err) {
      if ((err as { statusCode?: number }).statusCode === 403) {
        dispatch({ type: types.SET_ME, me: null });
      }
    }
  };
}

export function register(
  { username, password, email }: Omit<User, "id"> & { password: string },
  redirectTo: string,
  captchaToken?: string,
) {
  // Returns the request so the page can show it's working, and show what
  // went wrong if it fails. On success the page reloads at the destination.
  return function (dispatch: Dispatch<MainActions>) {
    return makeRequest<User>("/users", {
      method: "POST",
      json: { username, password, email, captchaToken },
    }).then((user) => {
      dispatch({ type: types.SET_ME, me: user });
      window.location.href = postAuthPath(redirectTo);
    });
  };
}

export function login(
  { username, password }: { username: string; password: string },
  redirectTo: string,
) {
  // Returns the request, like register().
  return function (dispatch: Dispatch<MainActions>) {
    return makeRequest<User>("/sessions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(username + ":" + password)}`,
      },
    }).then((user) => {
      dispatch({ type: types.SET_ME, me: user });
      window.location.href = postAuthPath(redirectTo);
    });
  };
}

export function fetchUser(username: string) {
  // Returned so the profile page can tell a player who doesn't exist from one
  // who's still loading.
  return function (dispatch: Dispatch<MainActions>) {
    return makeRequest<User>(`/users/${username}`).then((profile) => {
      dispatch({ type: types.UPSERT_PROFILE, profile });
    });
  };
}

export function fetchWorldsForUser(user: string | "me") {
  return function (dispatch: Dispatch<MainActions>) {
    makeRequest<Game[]>(`/worlds`, { query: { user: user } }).then((worlds) => {
      dispatch({ type: types.UPSERT_WORLDS, worlds });
    });
  };
}

export function fetchWorld(id: ID) {
  return function (dispatch: Dispatch<MainActions>) {
    makeRequest<Game>(`/worlds/${id}`).then((world) => {
      dispatch({ type: types.UPSERT_WORLDS, worlds: [world] });
    });
  };
}

/**
 * Change a game's title, description and credits without touching the game itself -
 * what an author does from their published game's page. The request carries
 * no `data`, so it leaves both the saved game and any unsaved draft alone.
 */
export function updateWorldInfo(
  id: ID,
  {
    name,
    description,
    credits,
  }: { name: string; description: string | null; credits: string | null },
) {
  return async function (dispatch: Dispatch<MainActions>) {
    const saved = await makeRequest<Game>(`/worlds/${id}`, {
      method: "PUT",
      json: { name, description, credits },
    });
    // Take only what changed. The PUT response is the bare world - no user or
    // fork parent - and the play page reads world.user, so storing the whole
    // response would break the page the author is looking at.
    const existing: Game | undefined = window.store.getState().worlds?.[id];
    if (existing) {
      dispatch({
        type: types.UPSERT_WORLDS,
        worlds: [
          {
            ...existing,
            name: saved.name,
            description: saved.description,
            credits: saved.credits ?? null,
          },
        ],
      });
    }
  };
}

export function deleteWorld(id: ID) {
  return function (dispatch: Dispatch<MainActions>) {
    if (
      window.confirm("Are you sure you want to delete this world? This action cannot be undone.")
    ) {
      dispatch({ type: types.REMOVE_WORLD, id });
      makeRequest(`/worlds/${id}`, { method: "DELETE" });
    }
  };
}

export function createWorld({ from, fork }: { from?: ID; fork?: string } = {}) {
  return async function (_dispatch: Dispatch<MainActions>) {
    // Forking someone else's game drops the kid into a walkthrough of it.
    // Lessons have their own entrypoint - see lessons/start-lesson.ts.
    const qs = fork ? "tutorial=fork" : "";

    if (window.store.getState().me) {
      // Returned so callers can show progress until the redirect happens —
      // creating a world server-side can take a few seconds.
      return makeRequest<{ id: string }>(`/worlds`, {
        query: { from, fork },
        method: "POST",
      }).then((created) => {
        window.location.href = `/editor/${created.id}?${qs}`;
      });
    } else {
      const template = from ? await makeRequest<World>(`/worlds/${from}`) : {};
      const storageKey = `ls-${Date.now()}`;
      const storageWorld = Object.assign({}, template, { id: storageKey });
      localStorage.setItem(storageKey, JSON.stringify(storageWorld));
      window.location.href = `/editor/${storageKey}?localstorage=true&${qs}`;
    }
  };
}

export function uploadLocalStorageWorld(storageKey: string) {
  return function (dispatch: Dispatch<MainActions>): Promise<void> {
    let json = null;
    try {
      // The copy takes the game's saved version, and a game made signed out is
      // usually only autosaved as a draft — make its latest changes the saved
      // version first, or the account would get an empty or stale copy.
      commitLocalDraft(storageKey);
      const world = JSON.parse(window.localStorage.getItem(storageKey)!);
      if (world.uploadedAsId) {
        window.location.href = `/editor/${world.uploadedAsId}`;
        return Promise.resolve();
      }
      json = { name: world.name, data: world.data, thumbnail: world.thumbnail };
    } catch (err) {
      alert(`Sorry, your world could not be uploaded. ${err}`);
      window.location.href = "/dashboard";
      return Promise.resolve();
    }

    // Returned so callers can show progress until the redirect, and stop
    // showing it if a request fails.
    return makeRequest<Game>(`/worlds`, { method: "POST" }).then((created) =>
      makeRequest(`/worlds/${created.id}`, { method: "PUT", json }).then(() => {
        window.localStorage.setItem(storageKey, JSON.stringify({ uploadedAsId: created.id }));

        dispatch({
          type: types.UPSERT_WORLDS,
          worlds: [Object.assign({}, created, json)],
        });
        window.location.href = `/editor/${created.id}`;
      }),
    );
  };
}

export type ActionSetMe = {
  type: "SET_ME";
  me: null | User;
};
export type ActionNetworkActivity = {
  type: "NETWORK_ACTIVITY";
  error: Error | null;
  delta: number;
};
export type ActionUpsertProfile = {
  type: "UPSERT_PROFILE";
  profile: Profile;
};
export type ActionUpsertWorlds = {
  type: "UPSERT_WORLDS";
  worlds: Game[];
};
export type ActionRemoveWorld = {
  type: "REMOVE_WORLD";
  id: ID;
};
export type MainActions =
  | ActionSetMe
  | ActionNetworkActivity
  | ActionUpsertProfile
  | ActionUpsertWorlds
  | ActionRemoveWorld;
