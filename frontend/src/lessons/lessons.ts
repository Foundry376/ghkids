/**
 * The Learn Codako curriculum.
 *
 * Each lesson opens its own small world - the JSON in ./worlds, built by
 * scripts/build-lesson-worlds.ts - and runs the walkthrough steps registered
 * for its slug in editor/constants/lessons. Lessons run in order, but each one
 * starts from a prebuilt world, so a kid can begin anywhere.
 *
 * This module is imported by the lesson index page, so it deliberately holds no
 * editor code: the worlds are loaded on demand and the steps live elsewhere.
 */
export type Lesson = {
  slug: string;
  title: string;
  /** Shown on the lesson card. */
  caption: string;
  screenshot: string;
  /** Name given to the world this lesson creates, so it reads well in My Games. */
  worldName: string;
  loadWorld: () => Promise<unknown>;
};

const screenshot = (name: string) => new URL(`./screenshots/${name}`, import.meta.url).href;

export const LESSONS: Lesson[] = [
  {
    slug: "playback",
    title: "Play the Game",
    caption: "Start and stop a game, and move the hero with the arrow keys.",
    screenshot: screenshot("playback.jpg"),
    worldName: "Lesson 1: Play the Game",
    loadWorld: () => import("./worlds/playback.json").then((m) => m.default),
  },
  {
    slug: "draw-a-character",
    title: "Draw a Character",
    caption: "Draw a bridge piece in the paint tools and build a path over the lava.",
    screenshot: screenshot("draw-a-character.jpg"),
    worldName: "Lesson 2: Draw a Character",
    loadWorld: () => import("./worlds/draw-a-character.json").then((m) => m.default),
  },
  {
    slug: "record-a-rule",
    title: "Record a Rule",
    caption: "Use the recorder to show the hero how to climb over a boulder.",
    screenshot: screenshot("record-a-rule.jpg"),
    worldName: "Lesson 3: Record a Rule",
    loadWorld: () => import("./worlds/record-a-rule.json").then((m) => m.default),
  },
  {
    slug: "event-blocks",
    title: "Event Blocks",
    caption: "Put a rule in a green event block so it only runs when you press a key.",
    screenshot: screenshot("event-blocks.jpg"),
    worldName: "Lesson 4: Event Blocks",
    loadWorld: () => import("./worlds/event-blocks.json").then((m) => m.default),
  },
  {
    slug: "falling-boulder",
    title: "Falling Boulder",
    caption: "Teach a boulder to slip off a ledge, then teach it to fall.",
    screenshot: screenshot("falling-boulder.jpg"),
    worldName: "Lesson 5: Falling Boulder",
    loadWorld: () => import("./worlds/falling-boulder.json").then((m) => m.default),
  },
];

export function lessonForSlug(slug: string | undefined | null) {
  return LESSONS.find((l) => l.slug === slug);
}

export function lessonAfter(slug: string) {
  const index = LESSONS.findIndex((l) => l.slug === slug);
  return index === -1 ? undefined : LESSONS[index + 1];
}
