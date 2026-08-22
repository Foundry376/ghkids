import { TutorialStepContent } from "../tutorial-content";

/**
 * Lesson 1 - Play the Game.
 *
 * Starts in a world where the hero can walk but can't reach the exit: the lava
 * pit in the middle has no bridge yet. The kid only plays here; lesson 2 builds
 * the bridge.
 */
export const playbackLessonContent: TutorialStepContent[] = [
  {
    pose: ["standing-pointing", "standing-talking"],
    text: `These buttons start and stop the game. When you play normal games you can't pause and rewind, but we're writing our own game! Rewinding makes it easier to see what's happening when the game doesn't work the way we expect it to.`,
    annotation: {
      selectors: ["[data-tutorial-id=controls]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `Click the 'Play' button to start my game.`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.ui.playback.running === true,
    },
  },
  {
    pose: "standing-talking",
    text: `You can move the hero around with the arrow keys on the keyboard. Go ahead and try it!`,
    waitsFor: {
      stateMatching: (state) => Object.keys(state.world.input.keys).length > 0,
      delay: 7000,
    },
  },
  {
    pose: ["ashamed", "folded-talking"],
    text: `Oops—you can't get to the exit yet! I need to make a bridge over the lava so the hero can walk across. Want to help me add the bridge? Click here to start the next lesson.`,
  },
];
