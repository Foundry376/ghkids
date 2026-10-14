import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { format } from "timeago.js";

import {
  createWorld,
  deleteWorld,
  fetchWorldsForUser,
  uploadLocalStorageWorld,
} from "../actions/main-actions";
import {
  commitLocalDraft,
  deleteLocalWorld,
  listLocalWorlds,
  LocalWorld,
  localWorldHref,
} from "../helpers/local-worlds";
import { useAppSelector } from "../hooks/redux";
import { usePageTitle } from "../hooks/usePageTitle";
import { PixelIcon } from "./common/pixel-icon";
import WorldCard, { WorldCardAction } from "./common/world-card";
import WorldList, { WorldGrid, WorldListEmpty } from "./common/world-list";
import { KidButton, KidNotice } from "./kid";

import "./app-surface.scss";

/** The games saved in this browser, kept fresh if another tab changes them. */
function useLocalWorlds() {
  const [worlds, setWorlds] = useState<LocalWorld[]>(() => listLocalWorlds());
  const refresh = useCallback(() => setWorlds(listLocalWorlds()), []);

  useEffect(() => {
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [refresh]);

  return { worlds, refresh };
}

/**
 * "My Games". Signed in: the games in your account, plus any still sitting on
 * this computer from before you signed in. Signed out: the games on this
 * computer — the only place they are — with a nudge to make an account.
 */
const DashboardPage: React.FC = () => {
  const dispatch = useDispatch();
  const me = useAppSelector((state) => state.me);
  const worlds = useAppSelector((state) => {
    if (!state.worlds || !state.me) return undefined;
    return Object.values(state.worlds)
      .filter((w) => w.userId === state.me?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  });
  const local = useLocalWorlds();
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  usePageTitle("My Games");

  useEffect(() => {
    if (me) {
      dispatch(fetchWorldsForUser("me"));
    }
  }, [dispatch, me]);

  // Making a game ends in a page load into the editor, so the button stays
  // busy until then. It only clears if the request fails.
  const onNewGame = async () => {
    setCreating(true);
    try {
      await dispatch(createWorld());
    } catch {
      setCreating(false);
    }
  };

  const onDeleteLocal = (world: LocalWorld) => {
    if (
      window.confirm(
        `Delete "${world.name}" from this computer? It isn't saved anywhere else, so it can't be brought back.`,
      )
    ) {
      deleteLocalWorld(world.storageKey);
      local.refresh();
    }
  };

  // Copies the game into the account, then opens it in the editor.
  const onSaveToAccount = (world: LocalWorld) => {
    setUploading(world.storageKey);
    // The copy takes the game's saved version, and a game made signed out is
    // usually only autosaved — make its latest changes the saved version first.
    commitLocalDraft(world.storageKey);
    dispatch(uploadLocalStorageWorld(world.storageKey));
  };

  const localCards = local.worlds.map((world) => {
    const actions: WorldCardAction[] = [
      { label: "Edit", icon: "edit", to: localWorldHref(world.storageKey), primary: true },
    ];
    if (me) {
      actions.push({
        label: uploading === world.storageKey ? "Saving…" : "Save to my account",
        icon: "upload",
        busy: uploading === world.storageKey,
        wide: true,
        onClick: () => onSaveToAccount(world),
      });
    }
    const when = world.updatedAt ?? world.createdAt;
    return (
      <WorldCard
        key={world.storageKey}
        name={world.name}
        thumbnail={world.thumbnail}
        to={localWorldHref(world.storageKey)}
        verb="edit"
        details={when ? <span>Changed {format(when)}</span> : undefined}
        actions={actions}
        menu={[{ label: "Delete", onSelect: () => onDeleteLocal(world), danger: true }]}
      />
    );
  });

  const newGameButton = (
    <KidButton
      variant="primary"
      icon={<PixelIcon name="plus" size={20} tint="currentColor" />}
      busy={creating}
      onClick={onNewGame}
    >
      {creating ? "Making your game…" : "New Game"}
    </KidButton>
  );

  const heading = (subtitle: string) => (
    <div className="games-page__heading">
      <div className="games-page__title">
        <Link className="app-back" to="/">
          <span aria-hidden="true">&larr;</span> Menu
        </Link>
        <h1>My Games</h1>
        <p>{subtitle}</p>
      </div>
      <div className="games-page__side">{newGameButton}</div>
    </div>
  );

  if (!me) {
    return (
      <div className="games-page">
        <div className="games-page__body">
          {heading("Games you’ve made on this computer.")}

          <KidNotice className="games-page__notice" title="Only on this computer">
            <p>
              These games are saved on this computer only. Anyone using this computer can see them,
              and clearing the browser deletes them. Sign in to keep them safe.
            </p>
            <div className="games-page__notice-actions">
              <KidButton variant="primary" to="/login?redirectTo=/dashboard">
                Sign in
              </KidButton>
              <KidButton to="/join?redirectTo=/dashboard">Make an account</KidButton>
            </div>
          </KidNotice>

          <WorldGrid
            empty={
              <WorldListEmpty
                icon="create"
                title="No games on this computer yet."
                action={
                  <KidButton variant="primary" busy={creating} onClick={onNewGame}>
                    {creating ? "Making your game…" : "Create a Game"}
                  </KidButton>
                }
              >
                Games you make will show up here, so you can come back to them.
              </WorldListEmpty>
            }
          >
            {localCards}
          </WorldGrid>
        </div>
      </div>
    );
  }

  return (
    <div className="games-page">
      <div className="games-page__body">
        {heading(
          worlds && worlds.length === 0
            ? "Nothing saved yet — make your first game."
            : "Pick up where you left off.",
        )}

        <WorldList
          worlds={worlds ?? null}
          canEdit
          label="Games in your account"
          onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
          onDuplicateWorld={(s) => dispatch(createWorld({ from: s.id }))}
          empty={
            <WorldListEmpty
              icon="create"
              title="No games in your account yet."
              action={
                <KidButton variant="primary" busy={creating} onClick={onNewGame}>
                  {creating ? "Making your game…" : "Create a Game"}
                </KidButton>
              }
            >
              Games you make are saved here, so you can open them on any computer.
            </WorldListEmpty>
          }
        />

        {localCards.length > 0 && (
          <section className="games-page__section" aria-labelledby="on-this-computer">
            <h2 className="games-page__section-heading" id="on-this-computer">
              <PixelIcon name="computer" size={32} />
              On this computer
            </h2>
            <p className="games-page__section-caption">
              Made before you signed in. Save them to your account to keep them safe.
            </p>
            <WorldGrid label="Games on this computer">{localCards}</WorldGrid>
          </section>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
