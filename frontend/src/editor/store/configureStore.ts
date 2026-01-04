import { createStore, compose, applyMiddleware, Store, StoreEnhancer } from "redux";
import thunk from "redux-thunk";
import { EditorState } from "../../types";
import rootReducer from "../reducers";
import { undoRedoMiddleware } from "../utils/undo-redo";

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

function configureStoreProd(initialState: EditorState): Store<EditorState> {
  return createStore(
    rootReducer,
    initialState,
    compose(applyMiddleware(thunk, undoRedoMiddleware)) as StoreEnhancer
  );
}

function configureStoreDev(initialState: EditorState): Store<EditorState> {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(
      applyMiddleware(
        // note this is slow af
        // reduxImmutableStateInvariant(),
        thunk,
        undoRedoMiddleware
      )
    ) as StoreEnhancer
  );

  if (import.meta.hot) {
    // Enable Webpack hot module replacement for reducers
    import.meta.hot.accept("../reducers", () => {
      const nextReducer = new URL("../reducers", import.meta.url).href.default;
      store.replaceReducer(nextReducer);
    });
  }

  return store;
}

const configureStore: (initialState: EditorState) => Store<EditorState> =
  process.env.NODE_ENV === "production" ? configureStoreProd : configureStoreDev;

export default configureStore;
