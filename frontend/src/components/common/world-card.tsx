import classNames from "classnames";
import React, { useState } from "react";
import { Link } from "react-router-dom";

import { KidButton } from "../kid";
import { PixelIcon, PixelIconName } from "./pixel-icon";
import WorldOptionsMenu, { WorldMenuItem } from "./world-options-menu";

import "./world-card.scss";

export type WorldCardAction = {
  label: string;
  icon?: PixelIconName;
  /** The one thing you're most likely to do with this game: drawn green. */
  primary?: boolean;
  /** Working on it: a spinner, and the button stops answering. */
  busy?: boolean;
  /** Too long to share a row: gets the full width, under the others. */
  wide?: boolean;
} & ({ to: string; onClick?: undefined } | { to?: undefined; onClick: () => void });

export type WorldCardProps = {
  name: string;
  /** A picture of the stage. Without one, the tile shows a blank frame. */
  thumbnail?: string | null;
  /** Where the picture and the name go. */
  to: string;
  /** What following `to` does, shown over the picture on hover. */
  verb: "play" | "edit";
  /** A tag in the picture's corner, e.g. "Published". */
  tag?: string;
  /** Small lines under the name: who made it, how often it's played… */
  details?: React.ReactNode;
  /** Square buttons along the bottom. */
  actions?: WorldCardAction[];
  /** Less common things to do, behind a "⋮" button. */
  menu?: WorldMenuItem[];
};

const VERBS = {
  play: { label: "Play", icon: "go" },
  edit: { label: "Edit", icon: "edit" },
} as const;

/**
 * One game, as a square tile: a big picture of its stage, its name, and
 * buttons for what you can do with it. It doesn't know where the game lives —
 * callers pass the links and actions, so the same tile shows your games, other
 * people's games and the games kept on this computer.
 */
const WorldCard = ({ name, thumbnail, to, verb, tag, details, actions, menu }: WorldCardProps) => {
  const { label: verbLabel, icon: verbIcon } = VERBS[verb];
  // "#" is the server's "no picture yet"; a picture that won't load is the same.
  const [broken, setBroken] = useState(false);
  const picture = thumbnail && thumbnail !== "#" && !broken ? thumbnail : null;

  return (
    <article className="game-tile">
      {/* The name below is the same link for keyboards and screen readers;
          the picture is a bigger target for the mouse and fingers. */}
      <Link className="game-tile__picture" to={to} tabIndex={-1} aria-hidden="true">
        {picture ? (
          <img src={picture} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="game-tile__blank">
            <PixelIcon name="picture" size={64} />
          </span>
        )}
        {tag && <span className="game-tile__tag">{tag}</span>}
        <span className="game-tile__verb">
          <PixelIcon name={verbIcon} size={24} tint="currentColor" />
          {verbLabel}
        </span>
      </Link>

      <div className="game-tile__body">
        <h3 className="game-tile__name">
          <Link to={to}>{name}</Link>
        </h3>
        {details && <div className="game-tile__details">{details}</div>}

        {!!(actions?.length || menu?.length) && (
          <div className="game-tile__actions">
            {actions?.map((action) => {
              const common = {
                variant: action.primary ? ("primary" as const) : ("secondary" as const),
                busy: action.busy,
                icon: action.icon && <PixelIcon name={action.icon} size={20} tint="currentColor" />,
                className: classNames("game-tile__action", {
                  "game-tile__action--wide": action.wide,
                }),
              };
              return action.to !== undefined ? (
                <KidButton key={action.label} {...common} to={action.to}>
                  {action.label}
                </KidButton>
              ) : (
                <KidButton key={action.label} {...common} onClick={action.onClick}>
                  {action.label}
                </KidButton>
              );
            })}
            {menu && menu.length > 0 && <WorldOptionsMenu worldName={name} items={menu} />}
          </div>
        )}
      </div>
    </article>
  );
};

export default WorldCard;
