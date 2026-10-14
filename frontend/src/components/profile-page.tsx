import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router";
import { Link } from "react-router-dom";

import { createWorld, deleteWorld, fetchUser, fetchWorldsForUser } from "../actions/main-actions";
import { useAppSelector } from "../hooks/redux";
import { usePageTitle } from "../hooks/usePageTitle";
import WorldList, { WorldListEmpty } from "./common/world-list";
import { KidNotice, KidPanel, PixelBadge } from "./kid";
import NotFoundPage from "./not-found-page";

import "./app-surface.scss";

/** A player's page, at /u/:username: their square, their name, their games. */
const ProfilePage = () => {
  const dispatch = useDispatch();

  const username = useParams().username!;
  // "missing" when there's no player by this name (a 404); "failed" for any
  // other error. Either way the games will never load, so stop waiting.
  const [lookup, setLookup] = useState<"ok" | "missing" | "failed">("ok");

  const { me, profile, worlds } = useAppSelector((state) => {
    const profile = state.profiles[username];
    return {
      me: state.me,
      profile,
      // Until we know who this is, we can't tell which games are theirs. Only
      // published games, even on your own profile: it shows you exactly what
      // everyone else sees.
      worlds:
        state.worlds && profile
          ? Object.values(state.worlds)
              .filter((w) => w.userId === profile.id && w.published)
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          : null,
    };
  });

  useEffect(() => {
    if (!username) {
      return;
    }
    let current = true;
    setLookup("ok");
    dispatch(fetchWorldsForUser(username));

    const lookUp = async () => {
      try {
        await dispatch(fetchUser(username));
      } catch (err) {
        // A late answer about the previous player doesn't apply to this one.
        if (!current) return;
        const status = (err as { statusCode?: number } | null)?.statusCode;
        setLookup(status === 404 ? "missing" : "failed");
      }
    };
    lookUp();
    return () => {
      current = false;
    };
  }, [dispatch, username]);

  usePageTitle(profile?.username ?? username);

  const name = profile?.username ?? username;
  const isMe = !!me && !!profile && me.id === profile.id;
  const gameCount =
    worlds && (worlds.length === 1 ? "1 published game" : `${worlds.length} published games`);

  if (lookup === "missing") {
    return <NotFoundPage />;
  }

  return (
    <div className="games-page">
      <div className="games-page__body">
        <KidPanel className="profile-header">
          <PixelBadge username={name} size="large" />
          <div className="profile-header__text">
            <h1>{name}</h1>
            {/* Kept while the games load, so the tile doesn't change height. */}
            <p>{[gameCount, isMe && "This is you"].filter(Boolean).join(" \u00b7 ") || "\u00a0"}</p>
          </div>
        </KidPanel>

        {isMe && (
          <KidNotice tone="info" title="This is what everyone sees">
            Only games you&rsquo;ve published show up on your page. To see all of your games,
            including the ones you haven&rsquo;t published, go to{" "}
            <Link className="kid-link" to="/dashboard">
              My Games
            </Link>
            .
          </KidNotice>
        )}

        <WorldList
          worlds={lookup === "failed" ? [] : worlds}
          canEdit={isMe}
          showPlays
          label={`Games by ${name}`}
          onDeleteWorld={(s) => dispatch(deleteWorld(s.id))}
          onDuplicateWorld={(s) => dispatch(createWorld({ from: s.id }))}
          empty={
            <WorldListEmpty
              icon="play"
              title={
                isMe
                  ? "You haven’t published any games yet."
                  : `${name} hasn’t published any games yet.`
              }
            >
              {isMe ? "Publish a game and it will show up here." : "Check back soon."}
            </WorldListEmpty>
          }
        />
      </div>
    </div>
  );
};

export default ProfilePage;
