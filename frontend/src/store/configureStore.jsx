import {createStore, compose, applyMiddleware} from 'redux';
import {routerMiddleware as createRouterMiddleware} from 'react-router-redux';
import {browserHistory} from 'react-router';
import reduxImmutableStateInvariant from 'redux-immutable-state-invariant';
import thunk from 'redux-thunk';

import rootReducer from '../reducers';
import {sessionStorageMiddleware} from '../helpers/session-storage';

// thunk middleware can also accept an extra argument to be passed to each thunk action
// https://github.com/gaearon/redux-thunk#injecting-a-custom-argument


const routerMiddleware = createRouterMiddleware(browserHistory);

function configureStoreProd(initialState) {
  return createStore(rootReducer, initialState, compose(
    applyMiddleware(
      routerMiddleware,
      sessionStorageMiddleware,
      thunk,
    )
  ));
}

function configureStoreDev(initialState) {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose; // add support for Redux dev tools
  const store = createStore(rootReducer, initialState, composeEnhancers(
    applyMiddleware(
      reduxImmutableStateInvariant(),
      routerMiddleware,
      sessionStorageMiddleware,
      thunk,
    )
  ));

  // if (module.hot) {
  //   // Enable Webpack hot module replacement for reducers
  //   module.hot.accept('../reducers', () => {
  //     const nextReducer = new URL('../reducers', import.meta.url).href.default; // eslint-disable-line global-require
  //     store.replaceReducer(nextReducer);
  //   });
  // }

  return store;
}

export default process.env.NODE_ENV === 'production' ? configureStoreProd : configureStoreDev;