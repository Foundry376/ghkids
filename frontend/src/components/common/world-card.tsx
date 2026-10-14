import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

/** A way into the game — "Edit", "Play" — shown over its picture. */
export type WorldCardOpen = {
  label: string;
  icon: PixelIconName;
  to: string;
};

export type WorldCardProps = {
  name: string;
  /** A picture of the stage. Without one, the tile shows a blank frame. */
  thumbnail?: string | null;
  /** Where the name goes, and a click on the picture with a mouse. */
  to: string;
  /** Ways into the game, over the picture: on hover with a mouse, after a
   *  first tap on a touch screen. */
  opens: WorldCardOpen[];
  /** A tag in the picture's corner, e.g. "Published". */
  tag?: string;
  /** Small lines under the name: who made it, how often it's played… */
  details?: React.ReactNode;
  /** Other buttons, under the name (e.g. "Save to my account"). */
  actions?: WorldCardAction[];
  /** Less common things to do, behind a "⋮" button. */
  menu?: WorldMenuItem[];
};

/**
 * One game, as a square tile: a big picture of its stage, its name, and what
 * you can do with it. It doesn't know where the game lives — callers pass the
 * links and actions, so the same tile shows your games, other people's games
 * and the games kept on this computer.
 *
 * "Edit" and "Play" sit over the picture rather than in rows of buttons under
 * every game. A mouse brings them up by pointing; a touch screen has nothing
 * to point with, so there the first tap brings them up and the second picks
 * one. A game with only one way in skips that and opens on the first tap.
 */
const WorldCard = ({ name, thumbnail, to, opens, tag, details, actions, menu }: WorldCardProps) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLElement>(null);
  // "touch" while the last press on this tile was a finger or a pen.
  const pointerType = useRef<string>("mouse");
  const [revealed, setRevealed] = useState(false);
  // "#" is the server's "no picture yet"; a picture that won't load is the same.
  const [broken, setBroken] = useState(false);
  const picture = thumbnail && thumbnail !== "#" && !broken ? thumbnail : null;

  // A tap anywhere else puts the buttons away again.
  useEffect(() => {
    if (!revealed) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) setRevealed(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [revealed]);

  const onPictureClick = (e: React.MouseEvent) => {
    // A press on one of the buttons is that button's to handle.
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (pointerType.current !== "mouse" && opens.length > 1 && !revealed) {
      setRevealed(true);
      return;
    }
    navigate(opens.length === 1 ? opens[0].to : to);
  };

  return (
    <article ref={cardRef} className={classNames("game-tile", { "game-tile--revealed": revealed })}>
      {/* The name below is the same link for keyboards and screen readers;
          the picture is a bigger target for the mouse and fingers. */}
      <div
        className="game-tile__picture"
        onPointerDown={(e) => {
          pointerType.current = e.pointerType;
        }}
        onClick={onPictureClick}
      >
        {picture ? (
          <img src={picture} alt="" loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="game-tile__blank">
            <PixelIcon name="picture" size={64} />
          </span>
        )}
        {tag && <span className="game-tile__tag">{tag}</span>}
        {opens.length > 0 && (
          <div className="game-tile__opens">
            {opens.map((open) => (
              <KidButton
                key={open.label}
                to={open.to}
                className="game-tile__open"
                aria-label={`${open.label} ${name}`}
                icon={<PixelIcon name={open.icon} size={20} tint="currentColor" />}
              >
                {open.label}
              </KidButton>
            ))}
          </div>
        )}
      </div>

      <div className="game-tile__body">
        <div className="game-tile__heading">
          <h3 className="game-tile__name">
            <Link to={to}>{name}</Link>
          </h3>
          {menu && menu.length > 0 && <WorldOptionsMenu worldName={name} items={menu} />}
        </div>
        {details && <div className="game-tile__details">{details}</div>}

        {!!actions?.length && (
          <div className="game-tile__actions">
            {actions.map((action) => {
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
          </div>
        )}
      </div>
    </article>
  );
};

export default WorldCard;
