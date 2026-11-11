import { useState } from "react";

import { useUpdateAvailable } from "../hooks/useUpdateAvailable";
import { KidButton } from "./kid";

import "./update-banner.scss";

/**
 * "There's a new version of Codako": a small card at the bottom of the window
 * once a release is out that this tab isn't running. Reloading is up to the
 * reader. Closing it only hides it: the next page they go to loads the update
 * anyway (see useReloadOnNavigationIfUpdated).
 */
export const UpdateBanner = () => {
  const available = useUpdateAvailable();
  const [dismissed, setDismissed] = useState(false);
  if (!available || dismissed) return null;

  return (
    <div className="update-banner" role="status">
      <span className="update-banner__icon" aria-hidden="true">
        <i className="fa fa-star" />
      </span>
      <div className="update-banner__text">
        <strong>There's a new version of Codako!</strong>
        <span>Reload the page to get it.</span>
      </div>
      <KidButton variant="primary" onClick={() => window.location.reload()}>
        Reload
      </KidButton>
      <button
        type="button"
        className="update-banner__close"
        aria-label="Not now"
        title="Not now"
        onClick={() => setDismissed(true)}
      >
        <i className="fa fa-times" aria-hidden="true" />
      </button>
    </div>
  );
};
