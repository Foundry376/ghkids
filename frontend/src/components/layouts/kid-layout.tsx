import { Link, Outlet, useLocation } from "react-router-dom";

import IdentityBubble from "./identity-bubble";

import "../app-surface.scss";
import "../kid/kid-kit.scss";
import "./kid-layout.scss";

/**
 * Every kid page outside the editor and play screens: the warm pixel canvas,
 * with a light header carrying the way home and who's signed in. Pages render
 * their own content column underneath; they don't need the .app-surface class
 * themselves.
 */
const KidLayout = () => {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <div className="app-surface kid-layout">
      <header className="kid-header">
        <div className="kid-header__start">
          {/* Home has the big wordmark already. */}
          {!isHome && (
            <Link className="app-wordmark kid-header__wordmark" to="/">
              Codako
            </Link>
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
