/* eslint-disable @typescript-eslint/no-explicit-any */
import * as types from "../constants/action-types";

// Use the production backend for development:
const API_ROOT = window.location.host.includes("staging")
  ? `https://staging.codako.org`
  : `https://www.codako.org`;
//
// const API_ROOT = window.location.host.includes("codako") ? `` : `http://localhost:8080`;

export async function makeRequest<T>(
  path: string,
  {
    method = "GET",
    query = {},
    headers = {},
    json,
    body,
  }: {
    method?: "GET" | "PUT" | "POST" | "DELETE";
    query?: { [key: string]: any };
    headers?: { [key: string]: any };
    json?: any;
    body?: any;
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
      headers: Object.assign(
        {
          "Content-Type": "application/json",
          Authorization: me && `Basic ${btoa(me.username + ":" + me.password)}`,
        },
        headers,
      ),
    });

    const responseJSON = await resp.json();
    if (responseJSON.error || resp.status !== 200) {
      throw new Error(responseJSON.message ?? resp.statusText);
    }

    dispatch({ type: types.NETWORK_ACTIVITY, error: null, delta: -1 });
    return responseJSON;
  } catch (error) {
    dispatch({ type: types.NETWORK_ACTIVITY, error, delta: -1 });
    throw error;
  }
}
