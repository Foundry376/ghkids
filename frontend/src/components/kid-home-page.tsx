import classNames from "classnames";
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";

import { createWorld } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";
import { PixelIcon, PixelIconName } from "./common/pixel-icon";
import { PixelSpinner } from "./kid";

import "./kid-home-page.scss";

type HomeTileProps = {
  icon: PixelIconName;
  /** Tints the square behind the icon: one color per kind of thing to do. */
  accent: "green" | "cyan" | "amber" | "coral";
  title: string;
  caption: string;
  busy?: boolean;
  busyCaption?: string;
} & ({ to: string; onClick?: undefined } | { to?: undefined; onClick: () => void });

/** One of the big squares. Places are links (so they open in a new tab and
 *  are crawlable); actions are buttons. */
const HomeTile = ({
  icon,
  accent,
  title,
  caption,
  busy,
  busyCaption,
  to,
  onClick,
}: HomeTileProps) => {
  const inner = (
    <>
      <span className="home-tile__plate" aria-hidden="true">
        {busy ? <PixelSpinner /> : <PixelIcon name={icon} size={72} />}
      </span>
      <span className="home-tile__text">
        <span className="home-tile__title">{title}</span>
        <span className="home-tile__caption">{busy ? busyCaption : caption}</span>
      </span>
    </>
  );
  const className = classNames("home-tile", `home-tile--${accent}`);

  return to !== undefined ? (
    <Link className={className} to={to}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={className} aria-busy={busy} disabled={busy} onClick={onClick}>
      {inner}
    </button>
  );
};

/**
 * The front door of Codako, at "/". Kids land here, so it's the playground
 * menu rather than a pitch: four big squares, and a quiet way to the pages
 * for grown-ups underneath. Home keeps the default document title.
 */
const KidHomePage: React.FC = () => {
  const dispatch = useDispatch();
  const signedIn = useAppSelector((state) => !!state.me);
  const [creating, setCreating] = useState(false);

  // Creating a world is a round trip to the server and then a page load, so
  // the tile stays busy until the editor takes over. It only clears if the
  // request fails, which puts the option back within reach.
  const onCreateGame = async () => {
    setCreating(true);
    try {
      await dispatch(createWorld());
    } catch {
      setCreating(false);
    }
  };

  return (
    <div className="kid-home">
      <div className="kid-home__masthead">
        <h1 className="app-wordmark kid-home__wordmark">Codako</h1>
        <p className="kid-home__prompt">Pick a square to get started.</p>
      </div>

      <nav className="kid-home__menu" aria-label="What to do">
        <HomeTile
          icon="create"
          accent="green"
          title="Create a Game"
          caption="Start with an empty stage."
          busy={creating}
          busyCaption="Making your game…"
          onClick={onCreateGame}
        />
        <HomeTile
          icon="open"
          accent="cyan"
          title="My Games"
          caption={signedIn ? "Your saved games." : "Games saved on this computer."}
          to="/dashboard"
        />
        <HomeTile
          icon="learn"
          accent="amber"
          title="Learn Codako"
          caption="Short lessons, one step at a time."
          to="/learn"
        />
        <HomeTile
          icon="play"
          accent="coral"
          title="Play Games"
          caption="Try games other kids made."
          to="/explore"
        />

        <Link className="home-parents" to="/parents">
          <PixelIcon name="parents" size={40} />
          <span className="home-parents__text">
            <span className="home-parents__title">For parents</span>
            <span className="home-parents__caption">
              What Codako is, and how kids learn with it.
            </span>
          </span>
        </Link>
      </nav>
    </div>
  );
};

export default KidHomePage;
