import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router";
import { Link } from "react-router-dom";

import { createWorld, deleteWorld, fetchUser, fetchWorldsForUser } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";
import { usePageTitle } from "../hooks/usePageTitle";
import WorldList, { WorldListEmpty } from "./common/world-list";
import { KidPanel, PixelBadge } from "./kid";

import "./app-surface.scss";

/** A player's page, at /u/:username: their square, their name, their games. */
const ProfilePage = () => {
  const dispatch = useDispatch();

  const username = useParams().username!;

  const { me, profile, worlds } = useAppSelector((state) => {
    const profile = state.profiles[username];
    return {
      me: state.me,
      profile,
      // Until we know who this is, we can't tell which games are theirs.
      worlds:
        state.worlds && profile
          ? Object.values(state.worlds)
              .filter((w) => w.userId === profile.id)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          : null,
    };
  });

  useEffect(() => {
    if (!username) {
      return;
    }
    dispatch(fetchUser(username));
    dispatch(fetchWorldsForUser(username));
  }, [dispatch, username]);

  usePageTitle(profile?.username ?? username);

  const name = profile?.username ?? username;
  const isMe = !!me && !!profile && me.id === profile.id;
  const gameCount = worlds && (worlds.length === 1 ? "1 game" : `${worlds.length} games`);

  return (
    <div className="games-page">
      <div className="games-page__body">
        <Link className="app-back" to="/">
          <span aria-hidden="true">&larr;</span> Menu
        </Link>

        <KidPanel className="profile-header">
          <PixelBadge username={name} size="large" />
          <div className="profile-header__text">
            <h1>{name}</h1>
            {/* Kept while the games load, so the tile doesn't change height. */}
            <p>{[gameCount, isMe && "This is you"].filter(Boolean).join(" \u00b7 ") || "\u00a0"}</p>
          </div>
        </KidPanel>

        <WorldList
          worlds={worlds}
          canEdit={isMe}
          showPlays
          label={`Games by ${name}`}
          onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
          onDuplicateWorld={(s) => dispatch(createWorld({ from: s.id }))}
          empty={
            <WorldListEmpty icon="play" title={`${name} hasn’t made any games yet.`}>
              {isMe ? "Games you make will show up here." : "Check back soon."}
            </WorldListEmpty>
          }
        />
      </div>
    </div>
  );
};

export default ProfilePage;
