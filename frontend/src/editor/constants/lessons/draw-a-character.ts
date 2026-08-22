import { stopPlayback } from "../../actions/ui-actions";
import { TutorialStepContent } from "../tutorial-content";
import { heroIn } from "./characters";

/**
 * Lesson 2 - Draw a Character.
 *
 * Same world lesson 1 ends in: a lava pit with no way across. The kid draws a
 * bridge piece in the paint tools and drags five of them over the lava.
 *
 * The stage is 14x8 and the gap runs from x=5 to x=9 on the row the hero walks,
 * which is what the annotation over the lava is measured against (40px squares,
 * counted from the top of the stage, so row 3 of 8 is the sixth row down).
 */
const STAGE_HEIGHT = 8;
const BRIDGE_ROW = 3;
const BRIDGE_FIRST_COLUMN = 5;
const BRIDGE_LENGTH = 5;
/** The first column of solid ground past the pit. */
const FAR_SIDE_COLUMN = 10;

export const drawACharacterLessonContent: TutorialStepContent[] = [
  {
    pose: "standing-pointing",
    text: `This is the stage - it's where we design our game world.`,
    annotation: { selectors: [".stages-horizontal-flex"], style: "outline" },
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    text: `This is the character library. It shows all of the game pieces we've made. You get to draw your own, so they can be anything you want! I've already made dirt and lava since this is a cave game. To help our hero over the lava, we need to make a new bridge piece.`,
    annotation: {
      selectors: ["[data-tutorial-id=characters]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `Go ahead and click on the + sign in the library and choose "Draw a new Character."`,
    annotation: {
      selectors: ["[data-tutorial-id=characters-add-button]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => !!state.ui.paint.characterId,
      delay: 2000,
    },
  },
  {
    pose: "standing-pointing",
    text: `Use the tools on the left side to draw a piece of a bridge. It can look like anything you want, and you can always come back and change it later.`,
    annotation: {
      selectors: ["[data-tutorial-id=paint-tools]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `When you're done, click the blue Save button.`,
    annotation: {
      selectors: ["[data-tutorial-id=paint-save-and-close]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => !state.ui.paint.characterId,
    },
  },
  {
    pose: ["standing-talking", "standing-pointing", "standing-talking"],
    text: `Nice! The bridge piece is in our library now. Move the mouse over it and drag it up into our game world to add it to our level. You can drag-and-drop pieces around the world to set it up the way you want.`,
    annotation: {
      selectors: ["[data-tutorial-id=characters] .item:last-child"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `If you make a mistake, click on the trash tool and then click a block you want to get rid of.`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-trash]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `Drag five blocks out from the library to create a bridge over the lava.`,
    annotation: {
      selectors: [".stages-horizontal-flex .background"],
      style: "outline",
      options: {
        width: 40 * BRIDGE_LENGTH,
        height: 34,
        offsetTop: 40 * (STAGE_HEIGHT - BRIDGE_ROW) + 6,
        offsetLeft: 40 * (BRIDGE_FIRST_COLUMN - 1),
      },
    },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const counts: { [characterId: string]: number } = {};
        Object.values(stage.actors).forEach((a) => {
          counts[a.characterId] = counts[a.characterId] ? counts[a.characterId] + 1 : 1;
        });
        return Object.values(counts).some((v) => v === BRIDGE_LENGTH);
      },
    },
  },
  {
    pose: "standing-pointing",
    text: `Let's see how your bridge does! Click 'Play' again and try using the arrow keys to walk over the lava. If you can't get to the other side, try moving the bridge pieces around.`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const hero = heroIn(stage);
        return hero && hero.position.x >= FAR_SIDE_COLUMN;
      },
    },
  },
  {
    pose: ["excited", "standing-confused", "standing-pointing"],
    text: `Great job - you made it over! Next, we need to teach our hero to climb so he can get over that boulder. Click here to start the next lesson.`,
  },
];
