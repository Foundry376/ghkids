import { Dispatch } from "redux";
import * as types from "../constants/action-types";
import { makeRequest } from "../helpers/api";
import { Game, World } from "../types";

const DEFAULT_POST_AUTH_PATH = "/dashboard";

// unfortunately they're numbers, but I wish they were strings so making a type
type ID = number;

export type User = { id: ID; username: string; password: string; email: string };
export type Profile = { id: ID; username: string };

export function logout() {
  return function (dispatch: Dispatch<MainActions>) {
    dispatch({
      type: types.SET_ME,
      me: null,
    });
    window.location.href = "/";
  };
}

export function register(
  { username, password, email }: Omit<User, "id">,
  redirectTo: string,
  captchaToken?: string,
) {
  return function (dispatch: Dispatch<MainActions>) {
    makeRequest<User>("/users", {
      method: "POST",
      json: { username, password, email, captchaToken },
    }).then((user) => {
      dispatch({
        type: types.SET_ME,
        me: Object.assign(user, { password }),
      });
      window.location.href = redirectTo || DEFAULT_POST_AUTH_PATH;
    });
  };
}

export function login(
  { username, password }: Pick<User, "username" | "password">,
  redirectTo: string,
) {
  return function (dispatch: Dispatch<MainActions>) {
    makeRequest<User>("/users/me", {
      headers: {
        Authorization: `Basic ${btoa(username + ":" + password)}`,
      },
    }).then((user) => {
      dispatch({
        type: types.SET_ME,
        me: Object.assign(user, { password }),
      });
      window.location.href = redirectTo || DEFAULT_POST_AUTH_PATH;
    });
  };
}

export function fetchUser(username: string) {
  return function (dispatch: Dispatch<MainActions>) {
    makeRequest<User>(`/users/${username}`).then((profile) => {
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

export function deleteWorld(id: ID) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (dispatch: any) {
    if (
      window.confirm("Are you sure you want to delete this world? This action cannot be undone.")
    ) {
      makeRequest(`/worlds/${id}`, { method: "DELETE" }).then(() => {
        dispatch(fetchWorldsForUser("me"));
      });
    }
  };
}

export function createWorld({ from, fork }: { from?: ID | "tutorial"; fork?: string } = {}) {
  return async function (_dispatch: Dispatch<MainActions>) {
    let qs = "";
    if (from === "tutorial") {
      qs = "tutorial=base";
    } else if (fork) {
      qs = "tutorial=fork";
    }

    if (window.store.getState().me) {
      makeRequest<{ id: string }>(`/worlds`, { query: { from, fork }, method: "POST" }).then(
        (created) => {
          window.location.href = `/editor/${created.id}?${qs}`;
        },
      );
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
  return function (dispatch: Dispatch<MainActions>) {
    let json = null;
    try {
      const world = JSON.parse(window.localStorage.getItem(storageKey)!);
      if (world.uploadedAsId) {
        window.location.href = `/editor/${world.uploadedAsId}`;
        return;
      }
      json = { name: world.name, data: world.data, thumbnail: world.thumbnail };
    } catch (err) {
      alert(`Sorry, your world could not be uploaded. ${err}`);
      window.location.href = "/dashboard";
      return;
    }

    console.log("Creating a new world");
    makeRequest<Game>(`/worlds`, { method: "POST" }).then((created) => {
      console.log("Uploading localstorage data to world");

      makeRequest(`/worlds/${created.id}`, { method: "PUT", json }).then(() => {
        console.log("Removing localstorage, redirecting to world");
        window.localStorage.setItem(storageKey, JSON.stringify({ uploadedAsId: created.id }));

        dispatch({
          type: types.UPSERT_WORLDS,
          worlds: [Object.assign({}, created, json)],
        });
        window.location.href = `/editor/${created.id}`;
      });
    });
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
export type MainActions =
  | ActionSetMe
  | ActionNetworkActivity
  | ActionUpsertProfile
  | ActionUpsertWorlds;
