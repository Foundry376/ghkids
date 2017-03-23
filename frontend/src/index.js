/* eslint-disable import/default */

import React from 'react';
import {render} from 'react-dom';
import { Provider } from 'react-redux';
import { Router, browserHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';

// Add support for touch-based click events
import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();

// Apply various polyfills
import objectValues from 'object.values';
if (!Object.values) {
  objectValues.shim();
}

import routes from './routes';
import configureStore from './store/configureStore';

import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/styles.scss';
import './styles/font-awesome.min.css';

const store = configureStore();
window.store = store;

// Create an enhanced history that syncs navigation events with the store
const history = syncHistoryWithStore(browserHistory, store);

render(
  <Provider store={store}>
    <Router history={history} routes={routes} />
  </Provider>, document.getElementById('app')
);
