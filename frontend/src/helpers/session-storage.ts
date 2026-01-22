/* eslint no-unused-vars: 0 */
import Cookies from "js-cookie";
import { MainState } from "../reducers/initial-state";

const KEY = "session";
const ONE_DAY = 24 * 60 * 60 * 1000;

let value = Cookies.get(KEY);

export const sessionStorageMiddleware =
  (store: { getState: () => MainState }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (next: (action: any) => any) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (action: any) => {
    const result = next(action);

    const { me } = store.getState();
    const nextValue = JSON.stringify({ me });
    if (value !== nextValue) {
      Cookies.set(KEY, nextValue, {
        expires: new Date(Date.now() + ONE_DAY * 365),
      });
      value = nextValue;
    }

    return result;
  };

export const getInitialState = () => {
  if (!value) {
    return null;
  }
  return JSON.parse(value);
};
