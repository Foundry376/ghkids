import React, { useState } from "react";
import { Link } from "react-router-dom";

import { usePageTitle } from "../hooks/usePageTitle";
import { LESSONS } from "../lessons/lessons";
import { startLesson } from "../lessons/start-lesson";

import "./app-surface.scss";

/**
 * The lesson index. Lessons run in order, so the cards are numbered — a kid
 * can jump in anywhere, since each lesson starts from its own prebuilt world.
 *
 * Picking one makes that world (a round trip to the server, then a page load),
 * so the card stays busy until the editor takes over.
 */
const LearnPage: React.FC = () => {
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  usePageTitle("Learn Codako");

  const onPick = async (slug: string) => {
    setBusy(slug);
    setFailed(null);
    try {
      await startLesson(LESSONS.find((l) => l.slug === slug)!);
    } catch {
      setBusy(null);
      setFailed(slug);
    }
  };

  return (
    <div className="app-surface learn-page">
      <div className="learn-page__body">
        <div className="learn-page__intro">
          <Link className="app-back" to="/start">
            <span aria-hidden="true">&larr;</span> Menu
          </Link>
          <h1>Learn Codako</h1>
          <p>
            {LESSONS.length} lessons that build a game one step at a time. Each one teaches a new
            thing and ends with something you can play. Start at the top, or jump to whatever you
            want to learn.
          </p>
        </div>

        <div className="learn-page__list">
          {LESSONS.map((lesson, i) => (
            <button
              key={lesson.slug}
              type="button"
              className="lesson-card"
              aria-busy={busy === lesson.slug}
              disabled={busy !== null}
              onClick={() => onPick(lesson.slug)}
            >
              <span
                className="lesson-card__shot"
                style={{ backgroundImage: `url(${lesson.screenshot})` }}
              >
                <span className="lesson-card__number">Lesson {i + 1}</span>
                <span className="lesson-card__play" aria-hidden="true">
                  <i className={`fa ${busy === lesson.slug ? "fa-spinner fa-spin" : "fa-play"}`} />
                </span>
              </span>
              <span className="lesson-card__body">
                <span className="lesson-card__title">{lesson.title}</span>
                <span className="lesson-card__caption">{lesson.caption}</span>
              </span>
            </button>
          ))}
        </div>

        {failed && (
          <div className="app-eyebrow learn-page__pending" role="status">
            That lesson couldn&rsquo;t be opened. Check your internet connection and try again.
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;
