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
    // Enable Vite hot module replacement for reducers
    import.meta.hot.accept("../reducers", (newModule) => {
      if (newModule) {
        store.replaceReducer(newModule.default);
      }
    });
  }

  return store;
}

const configureStore: (initialState: EditorState) => Store<EditorState> =
  import.meta.env.PROD ? configureStoreProd : configureStoreDev;

export default configureStore;
