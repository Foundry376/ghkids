import { render } from "react-dom";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { Provider } from "react-redux";

// Add support for touch-based click events
// import injectTapEventPlugin from 'react-tap-event-plugin';
// injectTapEventPlugin();

// Apply various polyfills
import "core-js";

import { initializeSentry } from "./utils/sentry";
initializeSentry();

import routes from "./routes";
import configureStore from "./store/configureStore";

import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter } from "react-router-dom";
import "./styles/font-awesome.min.css";
import "./styles/styles.scss";

const store = configureStore();
window.store = store;

const RECAPTCHA_SITE_KEY = `6LczpzwsAAAAADQs-j6-hokHJ8JUsqZ8NZ6t3BTC`;

// // Create an enhanced history that syncs navigation events with the store

const AppContent = (
  <Provider store={store}>
    <BrowserRouter>{routes}</BrowserRouter>
  </Provider>
);

render(
  RECAPTCHA_SITE_KEY ? (
    <GoogleReCaptchaProvider reCaptchaKey={RECAPTCHA_SITE_KEY}>
      {AppContent}
    </GoogleReCaptchaProvider>
  ) : (
    AppContent
  ),
  document.getElementById("root"),
);
