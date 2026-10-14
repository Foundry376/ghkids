import React from "react";
import { Link } from "react-router-dom";
import { format } from "timeago.js";

import { Game } from "../../types";
import { PixelBadge, PixelSpinner } from "../kid";
import { PixelIcon, PixelIconName } from "./pixel-icon";
import WorldCard, { WorldCardOpen } from "./world-card";
import { WorldMenuItem } from "./world-options-menu";

import "./world-card.scss";

/**
 * The grid game tiles sit in, with the two states every list of games has:
 * still loading, and nothing to show.
 */
export const WorldGrid = ({
  loading,
  loadingText = "Loading games…",
  empty,
  label,
  children,
}: {
  loading?: boolean;
  loadingText?: string;
  /** Shown when there are no children. */
  empty?: React.ReactNode;
  /** Names the list for screen readers when the page has more than one. */
  label?: string;
  children?: React.ReactNode;
}) => {
  if (loading) {
    return (
      <div className="game-grid__loading" role="status">
        <PixelSpinner />
        <span>{loadingText}</span>
      </div>
    );
  }
  const tiles = React.Children.toArray(children);
  if (tiles.length === 0) {
    return <>{empty}</>;
  }
  return (
    <ul className="game-grid" aria-label={label}>
      {tiles.map((tile, i) => (
        <li key={React.isValidElement(tile) && tile.key != null ? tile.key : i}>{tile}</li>
      ))}
    </ul>
  );
};

/** A friendly "nothing here", with an optional way forward. */
export const WorldListEmpty = ({
  icon = "open",
  title,
  children,
  action,
}: {
  icon?: PixelIconName;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="game-grid__empty">
    <span className="game-grid__empty-plate" aria-hidden="true">
      <PixelIcon name={icon} size={56} />
    </span>
    <div className="game-grid__empty-text">
      <p className="game-grid__empty-title">{title}</p>
      {children && <p className="game-grid__empty-caption">{children}</p>}
      {action && <div className="game-grid__empty-action">{action}</div>}
    </div>
  </div>
);

/** "12 plays · changed 3 days ago" */
const sentence = (parts: (string | false | null | undefined)[]) => {
  const text = parts.filter(Boolean).join(" · ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const plays = (count: number) =>
  count === 1 ? "1 play" : `${(count ?? 0).toLocaleString()} plays`;

/**
 * Games from the server. Your own games open in the editor and can be copied
 * or deleted; anyone else's open to play.
 */
const WorldList: React.FC<{
  worlds: Game[] | null;
  canEdit: boolean;
  /** "by mia_codes" — for lists with many people's games. */
  showAuthor?: boolean;
  /** How many times each game has been played. */
  showPlays?: boolean;
  onDuplicateWorld?: (game: Game) => void;
  onDeleteWorld?: (game: Game) => void;
  /** Replaces the standard "no games" message. */
  empty?: React.ReactNode;
  label?: string;
}> = ({
  worlds,
  canEdit,
  showAuthor,
  showPlays,
  onDuplicateWorld,
  onDeleteWorld,
  empty,
  label,
}) => (
  <WorldGrid
    loading={!worlds}
    label={label}
    empty={
      empty ?? (
        <WorldListEmpty title="No games here yet.">
          {canEdit ? "Games you make will show up here." : "Check back soon."}
        </WorldListEmpty>
      )
    }
  >
    {worlds?.map((world) => {
      const play = `/play/${world.id}`;
      const edit = `/editor/${world.id}`;
      const opens: WorldCardOpen[] = canEdit
        ? [
            { label: "Edit", icon: "edit", to: edit },
            { label: "Play", icon: "go", to: play },
          ]
        : [{ label: "Play", icon: "go", to: play }];
      const menu: WorldMenuItem[] = [];
      if (canEdit && onDuplicateWorld) {
        menu.push({ label: "Make a copy", onSelect: () => onDuplicateWorld(world) });
      }
      if (canEdit && onDeleteWorld) {
        menu.push({ label: "Delete", onSelect: () => onDeleteWorld(world), danger: true });
      }
      const parent = world.forkParent;
      // Lists of everyone's games say who made it instead of when.
      const facts = sentence([
        showPlays && plays(world.playCount),
        !showAuthor && world.updatedAt && `changed ${format(world.updatedAt)}`,
      ]);

      return (
        <WorldCard
          key={world.id}
          name={world.name || "Untitled game"}
          thumbnail={world.thumbnail}
          to={canEdit ? edit : play}
          opens={opens}
          tag={canEdit && world.published ? "Published" : undefined}
          menu={menu}
          details={
            <>
              {showAuthor && world.user && (
                <span className="game-tile__byline">
                  <PixelBadge username={world.user.username} size="small" />
                  <span>
                    by{" "}
                    <Link className="kid-link" to={`/u/${world.user.username}`}>
                      {world.user.username}
                    </Link>
                  </span>
                </span>
              )}
              {facts && <span>{facts}</span>}
              {parent && parent.user && (
                <span>
                  Remix of{" "}
                  <Link className="kid-link" to={`/play/${parent.id}`}>
                    {parent.name}
                  </Link>{" "}
                  by{" "}
                  <Link className="kid-link" to={`/u/${parent.user.username}`}>
                    {parent.user.username}
                  </Link>
                </span>
              )}
            </>
          }
        />
      );
    })}
  </WorldGrid>
);

export default WorldList;
