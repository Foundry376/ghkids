import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useParams } from "react-router-dom";
import Button from "reactstrap/lib/Button";

import { createWorld, fetchWorld } from "../actions/main-actions";
import { useHideRecaptchaBadge } from "../hooks/useHideRecaptchaBadge";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editorStoreRef = useRef<Store | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (worldId) {
      dispatch(fetchWorld(Number(worldId)));
    }
  }, [worldId, dispatch]);

  usePageTitle(world?.name);
  useHideRecaptchaBadge();

  // Listen for fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const startPlayback = useCallback(() => {
    if (editorStoreRef.current) {
      editorStoreRef.current.dispatch(updatePlaybackState({ speed: 500, running: true }));
    }
  }, []);

  const onPlay = useCallback(() => {
    setImmersive(true);

    // Attempt to enter fullscreen for a more immersive experience.
    // This silently fails on platforms that don't support it (e.g. iPhone iOS Safari).
    const canFullscreen = !!containerRef.current?.requestFullscreen;
    if (canFullscreen) {
      // Delay playback start so the fullscreen transition animation completes
      // before the game begins ticking
      containerRef.current!.requestFullscreen().then(() => {
        setTimeout(startPlayback, 400);
      }).catch(() => {
        // Fullscreen rejected — start playback immediately
        startPlayback();
      });
    } else {
      startPlayback();
    }
  }, [startPlayback]);

  const onExitImmersive = useCallback(() => {
    // Stop playback
    if (editorStoreRef.current) {
      editorStoreRef.current.dispatch(updatePlaybackState({ speed: 500, running: false }));
    }
    // Exit fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    setImmersive(false);
  }, []);

  const onToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (containerRef.current) {
      containerRef.current.requestFullscreen();
    }
  }, []);

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
          {immersive && (
            <Button size="sm" outline onClick={onToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
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
