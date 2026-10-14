import * as Sentry from "@sentry/react";
import { Outlet } from "react-router-dom";

import { useAppSelector } from "../hooks/redux";

/**
 * The bare shell every page renders in: a full-window column, the error
 * boundary, and the network activity bar. Site chrome belongs to the layout
 * routes underneath (layouts/kid-layout, layouts/parents-layout); the editor
 * and play pages sit directly in here and fill the window themselves.
 */
const App = () => {
  const network = useAppSelector((state) => state.network);

  return (
    <div className="page-container">
      <Sentry.ErrorBoundary
        fallback={(errorData) => (
          <div>
            Something went wrong!
            <h2>
              <code>{`${errorData.error}`}</code>
            </h2>
            <pre>
              <code>{`${errorData.error && typeof errorData.error === "object" && "stack" in errorData.error ? errorData.error.stack : null}`}</code>
              <code>{errorData.componentStack}</code>
            </pre>
          </div>
        )}
      >
        <Outlet />
      </Sentry.ErrorBoundary>
      <div className={`network-bar active-${network.pending > 0}`} />
    </div>
  );
};

export default App;
