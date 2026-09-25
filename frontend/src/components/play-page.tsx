import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { Button, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";

import { Store } from "redux";
import { createWorld, fetchWorld, updateWorldInfo } from "../actions/main-actions";
import { updatePlaybackState } from "../editor/actions/ui-actions";
import { RootPlayer } from "../editor/root-player";
import { getCurrentStage } from "../editor/utils/selectors";
import { useAppSelector } from "../hooks/redux";
import { useDismissibleMenu } from "../hooks/useDismissibleMenu";
import { FULLSCREEN_SHORTCUT_LABEL, useFullscreen } from "../hooks/useFullscreen";
import { usePageTitle } from "../hooks/usePageTitle";
import { EditorState } from "../types";
import PageMessage from "./common/page-message";

import "./play-page.scss";

const PlayPage: React.FC = () => {
  const { worldId } = useParams<{ worldId: string }>();
  const dispatch = useDispatch();

  const me = useAppSelector((state) => state.me);
  const worlds = useAppSelector((state) => state.worlds);

  const world = worlds && worldId ? worlds[worldId] : null;

  const [immersive, setImmersive] = useState(false);
  const { menuProps, open: menuOpen, toggle: toggleMenu } = useDismissibleMenu("player");
  /** Bumped by Restart, which rebuilds the game from the saved world. */
  const [session, setSession] = useState(0);
  const enteringFullscreenRef = useRef(false);
  const editorStoreRef = useRef<Store | null>(null);
  const {
    containerRef,
    isFullscreen,
    canFullscreen,
    enter: enterFullscreen,
    exit: exitFullscreen,
    toggle: toggleFullscreen,
  } = useFullscreen<HTMLDivElement>({ shortcut: true });

  useEffect(() => {
    if (worldId) {
      dispatch(fetchWorld(Number(worldId)));
    }
  }, [worldId, dispatch]);

  usePageTitle(world?.name);

  // When the user exits fullscreen while immersive (Escape key, Safari
  // controls, the toggle button, etc.), also leave immersive mode so the
  // landing overlay with navigation links reappears. Only on the way *out* of
  // fullscreen: on a phone without fullscreen, or when the browser refuses it,
  // the game plays immersive without ever being fullscreen, and checking
  // "immersive but not fullscreen" would stop it the moment it started.
  const wasFullscreenRef = useRef(false);
  useEffect(() => {
    const leftFullscreen = wasFullscreenRef.current && !isFullscreen;
    wasFullscreenRef.current = isFullscreen;
    if (leftFullscreen && immersive && !enteringFullscreenRef.current) {
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
      // Guard against the exit-fullscreen effect firing during the async transition
      enteringFullscreenRef.current = true;
      // Delay playback start so the fullscreen transition animation completes
      // before the game begins ticking
      enterFullscreen()
        .then(() => {
          enteringFullscreenRef.current = false;
          setTimeout(startPlayback, 400);
        })
        .catch(() => {
          enteringFullscreenRef.current = false;
          startPlayback();
        });
    } else {
      startPlayback();
    }
  }, [startPlayback, canFullscreen, enterFullscreen]);

  // RootPlayer hands over its new store in an effect, which runs before this
  // one (children's effects go first), so the restarted game is the one we start.
  useEffect(() => {
    if (session > 0) {
      startPlayback();
    }
  }, [session, startPlayback]);

  const onRestart = useCallback(() => setSession((s) => s + 1), []);

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

  const isOwner = me && me.id === world?.userId;

  // The author can fix the title and description right here, where they're
  // looking at them, instead of unpublishing and publishing again.
  const [editingInfo, setEditingInfo] = useState<{ name: string; description: string } | null>(
    null,
  );
  const [savingInfo, setSavingInfo] = useState(false);
  const onSaveInfo = async () => {
    if (!world || !editingInfo || !editingInfo.name.trim()) return;
    setSavingInfo(true);
    try {
      await dispatch(
        updateWorldInfo(world.id, {
          name: editingInfo.name.trim(),
          description: editingInfo.description.trim() || null,
        }),
      );
      setEditingInfo(null);
    } catch {
      window.alert("Sorry, your changes couldn't be saved. Please try again.");
    } finally {
      setSavingInfo(false);
    }
  };
  const editLabel = isOwner ? "Open in Editor" : "Remix this Game";
  const [currentStageName, setCurrentStageName] = useState<string | null>(null);

  useEffect(() => {
    const store = editorStoreRef.current;
    if (!store) return;
    const update = () => {
      const state = store.getState() as EditorState;
      setCurrentStageName(getCurrentStage(state)?.name ?? null);
    };
    update();
    return store.subscribe(update);
  }, [world, session]);

  if (!world || !world.data) {
    return <PageMessage text="Loading..." />;
  }

  return (
    <div
      ref={containerRef}
      className={`play-page ${immersive ? "play-page--immersive" : "play-page--landing"}`}
    >
      {/* Top bar - always visible */}
      <div className="play-top-bar">
        <div className="play-top-bar__brand-group">
          <div className="play-top-bar__actions">
            <ButtonDropdown {...menuProps} isOpen={menuOpen} toggle={toggleMenu}>
              <DropdownToggle size="sm" outline aria-label="Player menu">
                <i className="fa fa-ellipsis-v" />
              </DropdownToggle>
              <DropdownMenu>
                {immersive && (
                  <DropdownItem onClick={onExitImmersive}>
                    <i className="fa fa-info-circle fa-fw" style={{ marginRight: 8 }} />
                    Back to Game Info
                  </DropdownItem>
                )}
                {immersive && (
                  <DropdownItem onClick={onRestart}>
                    <i className="fa fa-refresh fa-fw" style={{ marginRight: 8 }} />
                    Restart Game
                  </DropdownItem>
                )}
                {canFullscreen && (
                  <DropdownItem
                    onClick={toggleFullscreen}
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <i
                      className={`fa ${isFullscreen ? "fa-compress" : "fa-expand"} fa-fw`}
                      style={{ marginRight: 8 }}
                    />
                    {isFullscreen ? "Exit Full Screen" : "Show Full Screen"}
                    <span style={{ marginLeft: "auto", paddingLeft: 24, opacity: 0.5 }}>
                      {FULLSCREEN_SHORTCUT_LABEL}
                    </span>
                  </DropdownItem>
                )}
                {(immersive || canFullscreen) && <DropdownItem divider />}
                <DropdownItem onClick={onEditOrRemix}>
                  <i className="fa fa-pencil fa-fw" style={{ marginRight: 8 }} />
                  {editLabel}
                </DropdownItem>
                <DropdownItem divider />
                <DropdownItem onClick={() => (window.location.href = "/")}>
                  <i
                    className="fa fa-sign-out fa-fw fa-flip-horizontal"
                    style={{ marginRight: 8 }}
                  />
                  Exit
                </DropdownItem>
              </DropdownMenu>
            </ButtonDropdown>
          </div>
          <span className="play-top-bar__brand">Codako</span>
        </div>
        <div className="play-top-bar__title">
          <span>{world.name}</span>
          {" by "}
          <Link to={`/u/${world.user.username}`}>{world.user.username}</Link>
          {currentStageName && <span className="play-top-bar__stage">: {currentStageName}</span>}
        </div>
      </div>

      {/* Stage area - always rendered, fills available space.
          Always pass immersive so the stage scales to fit even behind the landing overlay. */}
      <div className="play-stage-area">
        <RootPlayer
          world={world}
          editorStoreRef={editorStoreRef}
          immersive
          session={session}
        />
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
          {editingInfo ? (
            <input
              className="play-landing__title-input"
              value={editingInfo.name}
              maxLength={100}
              placeholder="Title"
              aria-label="Title"
              onChange={(e) => setEditingInfo({ ...editingInfo, name: e.target.value })}
            />
          ) : (
            <h2 className="play-landing__title">{world.name}</h2>
          )}
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
          {editingInfo ? (
            <div className="play-landing__edit-info">
              <textarea
                value={editingInfo.description}
                maxLength={300}
                rows={3}
                placeholder="Describe your game - how to play, who made it..."
                aria-label="Description"
                onChange={(e) => setEditingInfo({ ...editingInfo, description: e.target.value })}
              />
              <div className="play-landing__edit-info-buttons">
                <Button size="sm" outline color="light" onClick={() => setEditingInfo(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  disabled={savingInfo || !editingInfo.name.trim()}
                  onClick={onSaveInfo}
                >
                  {savingInfo ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {world.description && (
                <p className="play-landing__description">{world.description}</p>
              )}
              {isOwner && (
                <button
                  className="play-landing__edit-info-link"
                  onClick={() =>
                    setEditingInfo({ name: world.name, description: world.description ?? "" })
                  }
                >
                  <i className="fa fa-pencil" /> Edit title &amp; description
                </button>
              )}
            </>
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
