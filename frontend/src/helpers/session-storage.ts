import Cookies from "js-cookie";
import * as types from "../constants/action-types";

/**
 * The API sets this cookie when someone signs in, with their id and username,
 * so we know who they are before the first page draws. Their login itself is
 * in an HttpOnly cookie that scripts can't see.
 */
const KEY = "session";

function readSession() {
  try {
    return JSON.parse(Cookies.get(KEY) ?? "null");
  } catch {
    return null;
  }
}

export const sessionStorageMiddleware =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  () => (next: (action: any) => any) => (action: any) => {
    if (action.type === types.SET_ME && !action.me) {
      Cookies.remove(KEY);
    }
    return next(action);
  };

/**
 * Browsers signed in before sessions existed still have the password in this
 * cookie. Hand it to upgradeLegacySession once, and keep it out of the store.
 */
export const legacyPassword = (): string | undefined => readSession()?.me?.password;

export const getInitialState = () => {
  const me = readSession()?.me;
  return me ? { me: { id: me.id, username: me.username } } : null;
};
