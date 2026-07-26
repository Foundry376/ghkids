import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

import { createWorld } from "../actions/main-actions";
import { usePageTitle } from "../hooks/usePageTitle";
import { PixelIcon, PixelIconName } from "./common/pixel-icon";

import "./app-surface.scss";

type MenuOption = {
  key: string;
  icon: PixelIconName;
  title: string;
  caption: string;
  /** Shown in place of the caption while the option is working. */
  busyCaption?: string;
  quiet?: boolean;
  onSelect: () => void;
};

/**
 * The front door of the Codako playground. Everything past this page is the
 * app itself (make a game, play it, learn the tools); "Exit" is the only way
 * back out to the marketing site.
 */
const StartPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  usePageTitle("Start");

  // Creating a world is a round trip to the server and then a page load, so
  // the tile stays busy until the editor takes over. It only clears if the
  // request fails, which puts the option back within reach.
  const onCreateGame = async () => {
    setBusy("create");
    try {
      await dispatch(createWorld());
    } catch {
      setBusy(null);
    }
  };

  const options: MenuOption[] = [
    {
      key: "create",
      icon: "create",
      title: "Create a Game",
      caption: "Start with an empty stage.",
      busyCaption: "Making your game…",
      onSelect: onCreateGame,
    },
    {
      key: "open",
      icon: "open",
      title: "Open a Game",
      caption: "Keep working on a game you saved.",
      onSelect: () => navigate("/dashboard"),
    },
    {
      key: "learn",
      icon: "learn",
      title: "Learn Codako",
      caption: "Follow the lessons one at a time.",
      onSelect: () => navigate("/learn"),
    },
    {
      key: "exit",
      icon: "exit",
      title: "Exit",
      caption: "Go back to the Codako website.",
      quiet: true,
      onSelect: () => navigate("/"),
    },
  ];

  return (
    <div className="app-surface start-page">
      <div className="start-page__masthead">
        <h1 className="app-wordmark start-page__wordmark">Codako</h1>
        <p className="start-page__prompt">Pick a square to get started.</p>
      </div>

      <div className="start-page__menu">
        {options.map((option) => {
          const isBusy = busy === option.key;
          return (
            <button
              key={option.key}
              type="button"
              className={`start-tile ${option.quiet ? "start-tile--quiet" : ""}`}
              aria-busy={isBusy}
              disabled={isBusy}
              onClick={option.onSelect}
            >
              {isBusy ? (
                <span className="pixel-spinner" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                <PixelIcon name={option.icon} size={option.quiet ? 36 : 64} />
              )}
              <span className="start-tile__text">
                <span className="start-tile__title">{option.title}</span>
                <span className="start-tile__caption">
                  {isBusy ? option.busyCaption : option.caption}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StartPage;
