export type AcademyVideo = {
  videoId: string;
};

export type AcademySection = {
  slug: string;
  title: string;
  description: string;
  worldId: number;
  videos: AcademyVideo[];
};

/**
 * Static configuration for the Kodako Academy page.
 *
 * Each section corresponds to a tutorial world and lists the YouTube videos
 * that teach concepts using that world. Video metadata (title, thumbnail) is
 * fetched at runtime from YouTube via the /youtube/oembed/:videoId API proxy,
 * so only the YouTube video ID needs to be listed here.
 *
 * To add a new video: append a `{ videoId: "XXXXXXXXXXX" }` entry. To add a
 * whole new series: add a new section with the tutorial world's ID.
 */
export const ACADEMY_SECTIONS: AcademySection[] = [
  {
    slug: "fundamentals",
    title: "Getting Started with Codako",
    description:
      "Start here! This series covers the core concepts every Codako creator needs: drawing characters, placing them on a stage, and teaching them to move by demonstration.",
    worldId: 1,
    videos: [
      { videoId: "dQw4w9WgXcQ" },
      { videoId: "dQw4w9WgXcQ" },
      { videoId: "dQw4w9WgXcQ" },
      { videoId: "dQw4w9WgXcQ" },
    ],
  },
  {
    slug: "platformer",
    title: "Build a Platformer",
    description:
      "Learn the techniques behind side-scrolling games: gravity, jumping, collectibles, and enemies you can jump on. Perfect once you've mastered the basics.",
    worldId: 2,
    videos: [
      { videoId: "dQw4w9WgXcQ" },
      { videoId: "dQw4w9WgXcQ" },
      { videoId: "dQw4w9WgXcQ" },
    ],
  },
  {
    slug: "puzzle",
    title: "Design a Puzzle Game",
    description:
      "Explore how rules can be combined to create surprising puzzles. You'll learn about global variables, win conditions, and how to design levels that get harder over time.",
    worldId: 3,
    videos: [
      { videoId: "dQw4w9WgXcQ" },
      { videoId: "dQw4w9WgXcQ" },
      { videoId: "dQw4w9WgXcQ" },
    ],
  },
];
