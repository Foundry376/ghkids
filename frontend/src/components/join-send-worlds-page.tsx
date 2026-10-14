import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router";

import { uploadLocalStorageWorld } from "../actions/main-actions";
import { usePageTitle } from "../hooks/usePageTitle";
import { AuthPageFrame } from "./auth-page-frame";
import { KidButton, KidPanel, PixelSpinner } from "./kid";

/**
 * Where a kid lands after making an account from the editor's "Your work has
 * not been saved!" bar: /join-send-world?storageKey=… copies the game they
 * were making on this computer into their new account, then opens it.
 */
const JoinSendWorldsPage: React.FC = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const storageKey = new URLSearchParams(location.search).get("storageKey");

  usePageTitle("Saving your game");

  useEffect(() => {
    if (storageKey) {
      const timer = setTimeout(() => {
        dispatch(uploadLocalStorageWorld(storageKey));
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [dispatch, storageKey]);

  if (!storageKey) {
    return (
      <AuthPageFrame title="Nothing to save">
        <KidPanel className="auth-page__form">
          <p className="auth-page__text">
            We couldn&rsquo;t tell which game to save. Your saved games are in My Games.
          </p>
          <KidButton variant="primary" size="large" block to="/dashboard">
            Go to My Games
          </KidButton>
        </KidPanel>
      </AuthPageFrame>
    );
  }

  return (
    <AuthPageFrame title="Saving your game…" centered>
      <KidPanel className="auth-page__form auth-page__waiting" aria-busy="true">
        <PixelSpinner />
        <p className="auth-page__text" role="status">
          Copying your game into your account. This only takes a moment, then it opens right up.
        </p>
      </KidPanel>
    </AuthPageFrame>
  );
};

export default JoinSendWorldsPage;
