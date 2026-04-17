import express from "express";
import { logger } from "src/logger";

const router = express.Router();

type OEmbedResponse = {
  title: string;
  author_name: string;
  author_url: string;
  thumbnail_url: string;
  thumbnail_width: number;
  thumbnail_height: number;
  html: string;
};

type CacheEntry = {
  data: OEmbedResponse;
  fetchedAt: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const VIDEO_ID_RE = /^[A-Za-z0-9_-]{6,20}$/;
const cache = new Map<string, CacheEntry>();

router.get("/youtube/oembed/:videoId", async (req, res) => {
  const { videoId } = req.params;
  if (!VIDEO_ID_RE.test(videoId)) {
    return res.status(400).json({ message: "Invalid YouTube video ID." });
  }

  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return res.json({ videoId, ...cached.data });
  }

  try {
    const target = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`,
    )}&format=json`;
    const response = await fetch(target);
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ message: `YouTube returned ${response.status} for this video.` });
    }
    const data = (await response.json()) as OEmbedResponse;
    cache.set(videoId, { data, fetchedAt: Date.now() });
    res.json({ videoId, ...data });
  } catch (err) {
    logger.error(
      `YouTube oEmbed fetch failed for ${videoId}: ${err instanceof Error ? err.message : String(err)}`,
    );
    res.status(502).json({ message: "Could not reach YouTube." });
  }
});

export default router;
