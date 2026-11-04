/* eslint-disable @typescript-eslint/no-explicit-any */
import * as types from "../constants/action-types";

// Use the production backend for development:
const API_ROOT = window.location.host.includes("staging")
  ? `https://staging.codako.org`
  : `https://www.codako.org`;

// const API_ROOT = window.location.host.includes("codako") ? `` : `http://localhost:8080`;

let signInRequired = false;

/** True once the saved login was rejected and we're on our way to /login. */
export const isSignInRequired = () => signInRequired;

/**
 * The saved login stopped working, usually because the password was changed on
 * another device. Tell the user once and send them to sign in. The returned
 * promise never settles: the page is going away, and callers shouldn't show
 * their own errors on top of this one.
 */
function redirectToSignIn(): Promise<never> {
  if (!signInRequired) {
    signInRequired = true;
    window.alert("You've been signed out of Codako. Please sign in again to keep going.");
    window.store.dispatch({ type: types.SET_ME, me: null });
    const { pathname, search } = window.location;
    window.location.href = `/login?redirectTo=${encodeURIComponent(pathname + search)}`;
  }
  return new Promise(() => {});
}

export async function makeRequest<T>(
  path: string,
  {
    method = "GET",
    query = {},
    headers = {},
    json,
    body,
    keepalive,
  }: {
    method?: "GET" | "PUT" | "POST" | "DELETE";
    query?: { [key: string]: any };
    headers?: { [key: string]: any };
    json?: any;
    body?: any;
    keepalive?: boolean;
  } = {},
): Promise<T> {
  const { dispatch } = window.store;

  const qs: string[] = [];
  Object.keys(query).forEach((key) => {
    if (query[key]) {
      qs.push(`${key}=${encodeURIComponent(query[key])}`);
    }
  });

  dispatch({
    type: types.NETWORK_ACTIVITY,
    error: null,
    delta: 1,
  });

  const me = window.store.getState().me;

  try {
    const resp = await fetch(`${API_ROOT}${path}${qs.length > 0 ? `?` : ""}${qs.join("&")}`, {
      method,
      body: json ? JSON.stringify(json) : body,
      keepalive,
      headers: Object.assign(
        {
          "Content-Type": "application/json",
          Authorization: me && `Basic ${btoa(me.username + ":" + me.password)}`,
        },
        headers,
      ),
    });

    const responseJSON = await resp.json();

    // A caller that sets Authorization itself is the login form, where a
    // rejected password is an ordinary mistake rather than an expired login.
    if (resp.status === 403 && me && !headers.Authorization) {
      dispatch({ type: types.NETWORK_ACTIVITY, error: null, delta: -1 });
      return redirectToSignIn();
    }

    if (responseJSON.error || resp.status !== 200) {
      // statusCode lets callers tell "not found" from other failures.
      throw Object.assign(new Error(responseJSON.message ?? resp.statusText), {
        statusCode: resp.status,
      });
    }

    dispatch({ type: types.NETWORK_ACTIVITY, error: null, delta: -1 });
    return responseJSON;
  } catch (error) {
    dispatch({ type: types.NETWORK_ACTIVITY, error, delta: -1 });
    throw error;
  }
}
