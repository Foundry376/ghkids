import { createStore, compose, applyMiddleware } from "redux";
// import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import thunk from "redux-thunk";
import rootReducer from "../reducers";

import { undoRedoMiddleware } from "../utils/undo-redo";

// thunk middleware can also accept an extra argument to be passed to each thunk action
// https://github.com/gaearon/redux-thunk#injecting-a-custom-argument

function configureStoreProd(initialState) {
  return createStore(
    rootReducer,
    initialState,
    compose(applyMiddleware(thunk, undoRedoMiddleware))
  );
}

function configureStoreDev(initialState) {
  const composeEnhancers =
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose; // add support for Redux dev tools
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
    )
  );

  if (import.meta.hot) {
    // Enable Webpack hot module replacement for reducers
    import.meta.hot.accept("../reducers", () => {
      const nextReducer = new URL("../reducers", import.meta.url).href.default; // eslint-disable-line global-require
      store.replaceReducer(nextReducer);
    });
  }

  return store;
}

export default process.env.NODE_ENV === "production"
  ? configureStoreProd
  : configureStoreDev;
