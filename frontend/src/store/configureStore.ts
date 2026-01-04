import { applyMiddleware, compose, createStore, Store, StoreEnhancer } from "redux";
import reduxImmutableStateInvariant from "redux-immutable-state-invariant";
import thunk from "redux-thunk";

import { sessionStorageMiddleware } from "../helpers/session-storage";
import rootReducer from "../reducers";
import { MainState } from "../reducers/initial-state";

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
  }
}

function configureStoreProd(initialState: MainState): Store<MainState> {
  return createStore(
    rootReducer,
    initialState,
    compose(applyMiddleware(sessionStorageMiddleware, thunk)) as StoreEnhancer
  );
}

function configureStoreDev(initialState: MainState): Store<MainState> {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(
      applyMiddleware(reduxImmutableStateInvariant(), sessionStorageMiddleware, thunk)
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

const configureStore: (initialState: MainState) => Store<MainState> =
  process.env.NODE_ENV === "production" ? configureStoreProd : configureStoreDev;

export default configureStore;
