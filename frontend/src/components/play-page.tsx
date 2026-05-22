import { Button } from "reactstrap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useParams } from "react-router-dom";

import { createWorld, fetchWorld } from "../actions/main-actions";
import { useFullscreen } from "../hooks/useFullscreen";
import { usePageTitle } from "../hooks/usePageTitle";
import { RootPlayer } from "../editor/root-player";
import PageMessage from "./common/page-message";
import { useAppSelector } from "../hooks/redux";
import { updatePlaybackState } from "../editor/actions/ui-actions";
import { Store } from "redux";

import "./play-page.scss";

const PlayPage: React.FC = () => {
  const { worldId } = useParams<{ worldId: string }>();
  const dispatch = useDispatch();

  const me = useAppSelector((state) => state.me);
  const worlds = useAppSelector((state) => state.worlds);

  const world = worlds && worldId ? worlds[worldId] : null;

  const [immersive, setImmersive] = useState(false);
  const editorStoreRef = useRef<Store | null>(null);
  const {
    containerRef,
    isFullscreen,
    canFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
    toggle: toggleFullscreen,
  } = useFullscreen<HTMLDivElement>();

  useEffect(() => {
    if (worldId) {
      dispatch(fetchWorld(Number(worldId)));
    }
  }, [worldId, dispatch]);

  usePageTitle(world?.name);

  // When the user exits fullscreen while immersive (Escape key, Safari
  // controls, the toggle button, etc.), also leave immersive mode so the
  // landing overlay with navigation links reappears.
  useEffect(() => {
    if (!isFullscreen && immersive) {
      if (editorStoreRef.current) {
        editorStoreRef.current.dispatch(updatePlaybackState({ speed: 500, running: false }));
      }
      setImmersive(false);
    }
  }, [isFullscreen, immersive]);

  const startPlayback = useCallback(() => {
    if (editorStoreRef.current) {
      editorStoreRef.current.dispatch(updatePlaybackState({ speed: 500, running: true }));
    }
  }, []);

  const onPlay = useCallback(() => {
    setImmersive(true);

    // Attempt to enter fullscreen for a more immersive experience.
    // Silently falls back on platforms that don't support it (e.g. iPhone iOS Safari).
    if (canFullscreen) {
      // Delay playback start so the fullscreen transition animation completes
      // before the game begins ticking
      enterFullscreen()
        .then(() => setTimeout(startPlayback, 400))
        .catch(() => startPlayback());
    } else {
      startPlayback();
    }
  }, [startPlayback, canFullscreen, enterFullscreen]);

  const onExitImmersive = useCallback(() => {
    // Stop playback
    if (editorStoreRef.current) {
      editorStoreRef.current.dispatch(updatePlaybackState({ speed: 500, running: false }));
    }
    exitFullscreen();
    setImmersive(false);
  }, [exitFullscreen]);

  const onEditOrRemix = () => {
    if (!world) return;
    const isOwner = me && me.id === world.userId;
    if (isOwner) {
      window.location.href = `/editor/${world.id}`;
    } else {
      dispatch(createWorld({ from: world.id, fork: "true" }));
    }
  };

  if (!world || !world.data) {
    return <PageMessage text="Loading..." />;
  }

  const isOwner = me && me.id === world.userId;
  const editLabel = isOwner ? "Open in Editor" : "Remix this Game";

  return (
    <div
      ref={containerRef}
      className={`play-page ${immersive ? "play-page--immersive" : "play-page--landing"}`}
    >
      {/* Top bar - always visible */}
      <div className="play-top-bar">
        <Link className="play-top-bar__brand" to="/">
          Codako
        </Link>
        <div className="play-top-bar__title">
          <Link to={`/u/${world.user.username}`}>{world.user.username}</Link>
          <span className="play-top-bar__sep">/</span>
          <span>{world.name}</span>
        </div>
        <div className="play-top-bar__spacer" />
        <div className="play-top-bar__actions">
          {canFullscreen && (
            <Button
              size="sm"
              outline
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Full Screen" : "Show Full Screen"}
            >
              <i className={`fa ${isFullscreen ? "fa-compress" : "fa-expand"}`} />
            </Button>
          )}
          {immersive && (
            <Button size="sm" outline onClick={onExitImmersive} title="Back to info">
              <i className="fa fa-arrow-left" />
            </Button>
          )}
          <Button size="sm" color="success" onClick={onEditOrRemix}>
            {editLabel}
          </Button>
        </div>
      </div>

      {/* Stage area - always rendered, fills available space.
          Always pass immersive so the stage scales to fit even behind the landing overlay. */}
      <div className="play-stage-area">
        <RootPlayer world={world} editorStoreRef={editorStoreRef} immersive />
      </div>

      {/* Landing overlay - shown before play, fades out on play */}
      <div className={`play-landing ${immersive ? "play-landing--hidden" : ""}`}>
        <div className="play-landing__backdrop" />
        <div className="play-landing__content">
          {world.thumbnail && (
            <div className="play-landing__thumbnail">
              <img src={world.thumbnail} alt={world.name} />
            </div>
          )}
          <h2 className="play-landing__title">{world.name}</h2>
          <div className="play-landing__meta">
            <span>
              by <Link to={`/u/${world.user.username}`}>{world.user.username}</Link>
            </span>
            {world.forkParent && world.forkParent.user && (
              <span className="play-landing__remix-info">
                {" remixed from "}
                <Link to={`/play/${world.forkParent.id}`}>
                  {world.forkParent.user.username}/{world.forkParent.name}
                </Link>
              </span>
            )}
          </div>
          {world.description && (
            <p className="play-landing__description">{world.description}</p>
          )}
          <button className="play-landing__play-btn" onClick={onPlay}>
            <i className="fa fa-play" />
            <span>Play</span>
          </button>
          <div className="play-landing__stats">
            <span>
              <i className="fa fa-gamepad" /> {world.playCount} plays
            </span>
            <span>
              <i className="fa fa-code-fork" /> {world.forkCount} remixes
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayPage;
