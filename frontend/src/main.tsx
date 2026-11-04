import { render } from "react-dom";
import { Provider } from "react-redux";

// Add support for touch-based click events
// import injectTapEventPlugin from 'react-tap-event-plugin';
// injectTapEventPlugin();

// Apply various polyfills
import "core-js";

import { initializeSentry } from "./utils/sentry";
initializeSentry();

import { upgradeLegacySession } from "./actions/main-actions";
import routes from "./routes";
import initialState from "./reducers/initial-state";
import configureStore from "./store/configureStore";

import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter } from "react-router-dom";
import "./styles/font-awesome.min.css";
import "./styles/styles.scss";

const store = configureStore(initialState);
window.store = store;

// Pages load data as soon as they appear, so an old login has to become a
// session first. For everyone else this finishes immediately.
const dispatch = store.dispatch as unknown as (action: unknown) => Promise<void>;
dispatch(upgradeLegacySession()).finally(() => {
  render(
    <Provider store={store}>
      <BrowserRouter>{routes}</BrowserRouter>
    </Provider>,
    document.getElementById("root"),
  );
});
