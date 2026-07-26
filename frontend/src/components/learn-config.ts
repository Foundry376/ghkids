/**
 * The Learn Codako curriculum — an ordered set of lessons a kid works through
 * from top to bottom, though any lesson can be started on its own.
 *
 * `screenshot` is the picture shown on the lesson card, the same way a saved
 * game shows its thumbnail. Until each lesson has a real world to screenshot,
 * these point at the stage backgrounds that ship with the editor.
 */
export type Lesson = {
  slug: string;
  title: string;
  caption: string;
  screenshot: string;
};

const screenshot = (name: string) =>
  new URL(`../editor/img/backgrounds/${name}`, import.meta.url).href;

export const LESSONS: Lesson[] = [
  {
    slug: "meet-the-stage",
    title: "Meet the Stage",
    caption: "Look around the editor and put your first character on the stage.",
    screenshot: screenshot("Layer0_0.png"),
  },
  {
    slug: "draw-a-character",
    title: "Draw a Character",
    caption: "Use the paint tools to draw a character that looks like yours.",
    screenshot: screenshot("Layer0_1.png"),
  },
  {
    slug: "teach-it-to-move",
    title: "Teach It to Move",
    caption: "Turn on the recorder and show your character how to walk.",
    screenshot: screenshot("Layer0_2.png"),
  },
  {
    slug: "keys-and-clicks",
    title: "Keys and Clicks",
    caption: "Make characters react when you press a key or click on them.",
    screenshot: screenshot("Layer1_0.png"),
  },
  {
    slug: "rules-that-choose",
    title: "Rules That Choose",
    caption: "Put rules in a group so a character picks the one that fits.",
    screenshot: screenshot("Layer1_1.png"),
  },
  {
    slug: "score-and-win",
    title: "Score and Win",
    caption: "Add variables to keep score and decide when the game is won.",
    screenshot: screenshot("Layer1_2.png"),
  },
];
