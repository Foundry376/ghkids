import { Col, Container, Row } from "reactstrap";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { makeRequest } from "../helpers/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { Game } from "../types";
import { ACADEMY_SECTIONS, AcademySection } from "./academy-config";

type VideoMetadata = {
  videoId: string;
  title: string;
  author_name: string;
  thumbnail_url: string;
};

const youtubeWatchUrl = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;

const AcademyPage: React.FC = () => {
  usePageTitle("Kodako Academy");

  return (
    <Container style={{ marginTop: 30, marginBottom: 60 }} className="academy">
      <Row>
        <Col md={12}>
          <div className="academy-hero">
            <h2>Kodako Academy</h2>
            <p>
              Watch short video tutorials that walk you through building games in Codako. Each
              series is based on a sample game world you can play, fork, and learn from.
            </p>
          </div>
        </Col>
      </Row>
      {ACADEMY_SECTIONS.map((section) => (
        <AcademySectionView key={section.slug} section={section} />
      ))}
    </Container>
  );
};

const AcademySectionView: React.FC<{ section: AcademySection }> = ({ section }) => {
  const [world, setWorld] = useState<Game | null>(null);
  const [worldError, setWorldError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    makeRequest<Game>(`/worlds/${section.worldId}`)
      .then((fetched) => {
        if (!cancelled) setWorld(fetched);
      })
      .catch(() => {
        if (!cancelled) setWorldError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [section.worldId]);

  return (
    <Row className="academy-section">
      <Col md={4}>
        <div className="academy-world-card">
          {world?.thumbnail ? (
            <Link to={`/play/${section.worldId}`}>
              <img className="academy-world-thumbnail" src={world.thumbnail} alt={section.title} />
            </Link>
          ) : (
            <div className="academy-world-thumbnail academy-world-thumbnail-placeholder">
              {worldError ? "Example world not published yet" : "Loading..."}
            </div>
          )}
          <h4>{section.title}</h4>
          <p>{section.description}</p>
          {world && (
            <Link className="btn btn-secondary btn-sm" to={`/play/${section.worldId}`}>
              Play the example
            </Link>
          )}
        </div>
      </Col>
      <Col md={8}>
        <div className="academy-video-grid">
          {section.videos.map((video, idx) => (
            <AcademyVideoCard key={`${video.videoId}-${idx}`} videoId={video.videoId} />
          ))}
        </div>
      </Col>
    </Row>
  );
};

const AcademyVideoCard: React.FC<{ videoId: string }> = ({ videoId }) => {
  const [meta, setMeta] = useState<VideoMetadata | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    makeRequest<VideoMetadata>(`/youtube/oembed/${videoId}`)
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  const fallbackThumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const thumbnail = meta?.thumbnail_url ?? fallbackThumb;
  const title = meta?.title ?? (error ? "Video unavailable" : "Loading…");

  return (
    <a
      className="academy-video-card"
      href={youtubeWatchUrl(videoId)}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="academy-video-thumb-wrap">
        <img className="academy-video-thumb" src={thumbnail} alt={title} loading="lazy" />
        <div className="academy-video-play" aria-hidden="true">
          <svg viewBox="0 0 68 48" width="48" height="34">
            <path
              d="M66.52 7.74a8 8 0 0 0-5.64-5.66C55.82 1 34 1 34 1S12.18 1 7.12 2.08a8 8 0 0 0-5.64 5.66C.4 12.82.4 24 .4 24s0 11.18 1.08 16.26a8 8 0 0 0 5.64 5.66C12.18 47 34 47 34 47s21.82 0 26.88-1.08a8 8 0 0 0 5.64-5.66C67.6 35.18 67.6 24 67.6 24s0-11.18-1.08-16.26z"
              fill="#f00"
            />
            <path d="M27 34V14l17.5 10L27 34z" fill="#fff" />
          </svg>
        </div>
      </div>
      <div className="academy-video-title">{title}</div>
      {meta?.author_name && <div className="academy-video-author">{meta.author_name}</div>}
    </a>
  );
};

export default AcademyPage;
