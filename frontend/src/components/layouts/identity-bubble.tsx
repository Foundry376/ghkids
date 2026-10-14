import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { logout } from "../../actions/main-actions";
import { useAppSelector } from "../../hooks/redux";
import { useAuthParams } from "../auth-params";
import { PixelIcon } from "../common/pixel-icon";
import { KidButton, PixelBadge } from "../kid";

/**
 * Who's using Codako right now, top right on every kid page. Kids can make
 * games without an account, so this has to make it obvious whether their
 * work is going to their account or only to this computer.
 */
const IdentityBubble = () => {
  const me = useAppSelector((state) => state.me);
  return me ? <SignedIn username={me.username} /> : <SignedOut />;
};

const SignedOut = () => {
  const { pathname, search } = useLocation();
  const { linkTo } = useAuthParams();

  // Don't offer a way to the page you're already on.
  const onLogin = pathname.startsWith("/login");
  const onJoin = pathname.startsWith("/join");

  // On a sign-in page, keep whatever it was opened for (where to go next, and
  // why). Anywhere else, come back here afterwards — home is the default.
  const authLink = (to: string) => {
    if (onLogin || onJoin) return linkTo(to);
    if (pathname === "/") return to;
    return { pathname: to, search: `?${new URLSearchParams({ redirectTo: pathname + search })}` };
  };

  return (
    <div className="identity identity--signed-out">
      <div className="identity__bubble">
        <PixelBadge />
        <span className="identity__text">
          <span className="identity__name">Not signed in</span>
          <span className="identity__status">Games save on this computer only</span>
        </span>
      </div>
      <div className="identity__actions">
        {!onLogin && (
          <KidButton
            variant="primary"
            size="large"
            to={authLink("/login")}
            className="identity__sign-in"
          >
            Sign in
          </KidButton>
        )}
        {!onJoin && (
          <Link className="kid-link identity__join" to={authLink("/join")}>
            Create an account
          </Link>
        )}
      </div>
    </div>
  );
};

const SignedIn = ({ username }: { username: string }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Set when the menu was opened from the keyboard, so focus moves into it.
  const focusOnOpen = useRef<"first" | "last" | null>(null);

  const items = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    if (focusOnOpen.current) {
      const all = items();
      all[focusOnOpen.current === "first" ? 0 : all.length - 1]?.focus();
      focusOnOpen.current = null;
    }
    // Close on a click anywhere else.
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onButtonKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusOnOpen.current = e.key === "ArrowDown" ? "first" : "last";
      if (open) {
        const all = items();
        all[e.key === "ArrowDown" ? 0 : all.length - 1]?.focus();
      } else {
        setOpen(true);
      }
    }
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const all = items();
    const index = all.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      all[(index + 1) % all.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      all[(index - 1 + all.length) % all.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      all[e.key === "Home" ? 0 : all.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const onSignOut = () => {
    close(false);
    if (
      window.confirm(
        "Sign out of Codako?\n\nYour games are saved to your account. Sign back in any time to keep working on them.",
      )
    ) {
      dispatch(logout());
    }
  };

  return (
    <div className="identity identity--signed-in" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className="identity__bubble"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "identity-menu" : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={onButtonKeyDown}
      >
        <PixelBadge username={username} />
        <span className="identity__text">
          <span className="identity__name">
            <span className="kid-sr-only">Signed in as </span>
            {username}
          </span>
          <span className="identity__status">
            <span className="identity__check" aria-hidden="true">
              ✓
            </span>
            Saved to your account
          </span>
        </span>
        {/* A down arrow drawn in pixels: rows of 7, 5, 3 and 1. */}
        <svg
          className="identity__caret"
          width="21"
          height="12"
          viewBox="0 0 7 4"
          shapeRendering="crispEdges"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M0 0h7v1H0zM1 1h5v1H1zM2 2h3v1H2zM3 3h1v1H3z" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          id="identity-menu"
          className="identity__menu"
          role="menu"
          aria-label="Your account"
          onKeyDown={onMenuKeyDown}
        >
          <Link
            role="menuitem"
            className="identity__menu-item"
            to="/dashboard"
            onClick={() => setOpen(false)}
          >
            <PixelIcon name="open" size={28} />
            My Games
          </Link>
          <button role="menuitem" type="button" className="identity__menu-item" onClick={onSignOut}>
            <PixelIcon name="exit" size={28} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default IdentityBubble;
