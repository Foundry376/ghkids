import { useState } from "react";
import { SUGGEST_HOME_SCREEN_APP } from "../utils/home-screen-app";

const DISMISSED_KEY = "codako-home-screen-prompt-dismissed";

function wasDismissed() {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

/** Safari's share button: a box with an arrow coming out of the top. */
const ShareIcon = () => (
  <svg
    className="home-screen-prompt__share-icon"
    viewBox="0 0 20 24"
    width="16"
    height="19"
    aria-label="Share"
    role="img"
  >
    <path
      d="M7 9H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10a1 1 0 0 0-1-1h-3M10 15V2M6 6l4-4 4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * In Safari on an iPad, suggests adding Codako to the Home Screen, where it
 * gets the whole screen. Shown once per visit when the editor opens.
 */
export const HomeScreenAppPrompt = () => {
  const [open, setOpen] = useState(() => SUGGEST_HOME_SCREEN_APP && !wasDismissed());
  if (!open) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Private browsing: it just shows again next visit.
    }
    setOpen(false);
  };

  return (
    <div className="editor-fullscreen-overlay">
      <div className="editor-fullscreen-overlay__backdrop" onClick={dismiss} />
      <div className="editor-fullscreen-overlay__content home-screen-prompt">
        <h2>Make Codako fill the screen</h2>
        <p>
          Put Codako on your Home Screen. It opens like an app, with the whole screen for your game.
        </p>
        <ol className="home-screen-prompt__steps">
          <li>
            Tap <ShareIcon /> at the top of Safari.
          </li>
          <li>
            Tap <strong>Add to Home Screen</strong> (you may need to tap <strong>View More</strong>{" "}
            first), then <strong>Add</strong>.
          </li>
          <li>Open Codako from your Home Screen.</li>
        </ol>
        <p className="home-screen-prompt__note">
          Games saved on this iPad in Safari stay in Safari. Sign in to have your games in both.
        </p>
        <button className="editor-fullscreen-overlay__btn" onClick={dismiss}>
          Got it
        </button>
      </div>
    </div>
  );
};
