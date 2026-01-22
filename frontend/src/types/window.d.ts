import { type Store } from "redux";

declare global {
  interface Window {
    store: Store<any>;
    editorStore?: Store<any>;
  }
}
