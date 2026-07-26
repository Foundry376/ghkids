import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";

import { createWorld, deleteWorld, fetchWorldsForUser } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";
import { usePageTitle } from "../hooks/usePageTitle";
import WorldList from "./common/world-list";

import "./app-surface.scss";

/**
 * "Open a Game" — the player's own games, inside the app rather than on the
 * marketing site, so it carries the app surface and its own way back to the
 * start menu instead of the site navigation.
 */
const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const worlds = useAppSelector((state) => {
    if (!state.worlds || !state.me) return undefined;
    return Object.values(state.worlds)
      .filter((w) => w.userId === state.me?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });

  usePageTitle("My Games");

  useEffect(() => {
    if (!window.store.getState().me) {
      window.location.href = `/login?redirectTo=/dashboard`;
      return;
    }

    dispatch(fetchWorldsForUser("me"));
  }, [dispatch]);

  return (
    <div className="app-surface games-page">
      <div className="games-page__body">
        <div className="games-page__heading">
          <div>
            <Link className="app-back" to="/start">
              <span aria-hidden="true">&larr;</span> Menu
            </Link>
            <h1>My Games</h1>
            <p>
              {worlds && worlds.length === 0
                ? "Nothing saved yet — make your first game."
                : "Pick up where you left off."}
            </p>
          </div>
          <button type="button" className="games-page__new" onClick={() => dispatch(createWorld())}>
            New Game
          </button>
        </div>

        <WorldList
          worlds={worlds ?? null}
          onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
          onDuplicateWorld={(s) => dispatch(createWorld({ from: s.id }))}
          canEdit
        />
      </div>
    </div>
  );
};

export default DashboardPage;
