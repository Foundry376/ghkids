import { type Store } from "redux";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store: Store<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editorStore?: Store<any>;
  }
}
