import React, { useState } from "react";
import { Link } from "react-router-dom";

import { usePageTitle } from "../hooks/usePageTitle";
import { LESSONS } from "./learn-config";

import "./app-surface.scss";

/**
 * The lesson index. Lessons run in order, so the cards are numbered — a kid
 * can jump in anywhere, then keep going from where they stopped.
 *
 * Starting a lesson isn't wired up yet; picking one says so instead of
 * quietly doing nothing.
 */
const LearnPage: React.FC = () => {
  const [pending, setPending] = useState<string | null>(null);

  usePageTitle("Learn Codako");

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
              onClick={() => setPending(lesson.title)}
            >
              <span
                className="lesson-card__shot"
                style={{ backgroundImage: `url(${lesson.screenshot})` }}
              >
                <span className="lesson-card__number">Lesson {i + 1}</span>
                <span className="lesson-card__play" aria-hidden="true">
                  <i className="fa fa-play" />
                </span>
              </span>
              <span className="lesson-card__body">
                <span className="lesson-card__title">{lesson.title}</span>
                <span className="lesson-card__caption">{lesson.caption}</span>
              </span>
            </button>
          ))}
        </div>

        {pending && (
          <div className="app-eyebrow learn-page__pending" role="status">
            {pending} isn&rsquo;t ready to play yet — it&rsquo;s coming soon.
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;
