import { Outlet, useLocation } from "react-router-dom";

import { KidButton } from "../kid";
import IdentityBubble from "./identity-bubble";

import "../app-surface.scss";
import "../kid/kid-kit.scss";
import "./kid-layout.scss";

/**
 * Every kid page outside the editor and play screens: the warm pixel canvas,
 * with a light header carrying the way back to the menu and who's signed in.
 * The back link lives here rather than in each page so it sits in the same
 * spot everywhere, whatever the width of the page below. Pages render
 * their own content column underneath; they don't need the .app-surface class
 * themselves.
 */
const KidLayout = () => {
  const { pathname } = useLocation();
  // Home is the menu. Saving a game to a new account leaves on its own when
  // it's done, and leaving partway would interrupt it.
  const showBack = pathname !== "/" && !pathname.startsWith("/join-send-world");

  return (
    <div className="app-surface kid-layout">
      <header className="kid-header">
        <div className="kid-header__start">
          {showBack && (
            <KidButton to="/" icon={<span aria-hidden="true">&larr;</span>}>
              Menu
            </KidButton>
          )}
        </div>
        <IdentityBubble />
      </header>
      <main className="kid-layout__main">
        <Outlet />
      </main>
    </div>
  );
};

export default KidLayout;
