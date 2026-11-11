import * as Sentry from "@sentry/react";
import { Outlet, useLocation } from "react-router-dom";

import { useAppSelector } from "../hooks/redux";
import { useReloadOnNavigationIfUpdated } from "../hooks/useUpdateAvailable";
import { UpdateBanner } from "./update-banner";

/**
 * The bare shell every page renders in: a full-window column, the error
 * boundary, and the network activity bar. Site chrome belongs to the layout
 * routes underneath (layouts/kid-layout, layouts/parents-layout); the editor
 * and play pages sit directly in here and fill the window themselves.
 *
 * It also carries the "new version of Codako" banner. Not in the editor: a
 * reload there would interrupt work that isn't saved yet, and leaving the
 * editor already loads a fresh page, which picks up the update.
 */
const App = () => {
  const network = useAppSelector((state) => state.network);
  const { pathname } = useLocation();
  useReloadOnNavigationIfUpdated();

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
      {!pathname.startsWith("/editor/") && <UpdateBanner />}
      <div className={`network-bar active-${network.pending > 0}`} />
    </div>
  );
};

export default App;
