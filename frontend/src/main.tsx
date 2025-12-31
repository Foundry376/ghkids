import { render } from "react-dom";
import { Provider } from "react-redux";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

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

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

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
