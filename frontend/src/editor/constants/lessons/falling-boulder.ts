import { changeActors } from "../../actions/stage-actions";
import { stopPlayback } from "../../actions/ui-actions";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { TOOLS } from "../constants";
import { TutorialStepContent } from "../tutorial-content";
import { boulderIn, boulderPath, heroIn, heroPath, LESSON_CHARACTER_IDS } from "./characters";

/**
 * Lesson 5 - Falling Boulder.
 *
 * A boulder waits on a ledge over the path to the exit. The kid records two
 * rules on it: one that makes it slip off when the hero walks underneath, and
 * then the gravity rule that actually makes it fall.
 *
 * The slip rule is recorded with the hero parked two squares left and three
 * down from the boulder, so the recording box has to be dragged out to include
 * him. Once it slips into the air at x=10 there's empty space beneath it, which
 * is what the gravity rule is recorded against.
 */
const BOULDER_START = { x: 11, y: 7 };
/** Where the hero stands when the boulder should let go. */
const HERO_UNDER_LEDGE = { x: 9, y: 4 };
const HERO_START = { x: 2, y: 4 };
/** A few squares short of the ledge, so there's a walk-up before it falls. */
const HERO_APPROACH = { x: 5, y: 4 };
/** The column the boulder lands in once it slips off. */
const BOULDER_LANDING_COLUMN = 10;

export const fallingBoulderLessonContent: TutorialStepContent[] = [
  {
    pose: "folded-talking",
    text: `This time, we need to teach the boulder a new rule. When the hero gets close, it should slip off the ledge and start to fall! Let's say the hero should be...`,
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
    },
  },
  {
    pose: "folded-talking",
    text: `here when the boulder starts to fall. Remember how we created our first rule?`,
    onEnter: (dispatch) => {
      dispatch(changeActors(heroPath, { position: HERO_UNDER_LEDGE }));
    },
  },
  {
    pose: "standing-pointing",
    text: `Switch to the recording tool again. This time, click on the boulder!`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => {
        return (
          state.ui.selectedToolId === TOOLS.RECORD &&
          state.recording.characterId === LESSON_CHARACTER_IDS.boulder
        );
      },
    },
  },
  {
    pose: ["standing-confused", "sitting-talking"],
    text: `Perfect. See how the stage has grayed out? We want the boulder to slip when the hero is down below, so we need to include him in the rule. Can you expand the recording so our hero is inside the box?`,
    waitsFor: {
      stateMatching: (state, stage) => {
        const hero = heroIn(stage);
        return (
          hero &&
          state.recording.extent.xmin <= hero.position.x &&
          state.recording.extent.ymin <= hero.position.y
        );
      },
    },
  },
  {
    pose: "excited",
    text: `Okay good!`,
  },
  {
    pose: "standing-pointing",
    text: `To make our boulder fall off the ledge, drag it over by one square so it's in the air.`,
    waitsFor: {
      stateMatching: (state) => {
        const after = getCurrentStageForWorld(state.recording.afterWorld);
        if (!after) {
          return false;
        }
        const boulder = boulderIn(after);
        return boulder && boulder.position.x < BOULDER_START.x;
      },
    },
  },
  {
    pose: "standing-pointing",
    text: `Great! Now the boulder will slip off the ledge when our hero walks over and the picture on the left matches!`,
  },
  {
    pose: "standing-pointing",
    text: `Click 'Done' and let's try out your new rule.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-next-step]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => state.recording.characterId === null,
    },
  },
  {
    pose: "excited",
    text: `Press 'Play'! Walk the hero toward the boulder and let's see if it falls.`,
    onEnter: (dispatch) => {
      dispatch(changeActors(boulderPath, { position: BOULDER_START }));
      dispatch(changeActors(heroPath, { position: HERO_APPROACH }));
    },
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (state, stage) => {
        const boulder = boulderIn(stage);
        return (
          state.ui.playback.running === true && boulder && boulder.position.x < BOULDER_START.x
        );
      },
    },
  },
  {
    pose: "standing-confused",
    text: `Hmm... The boulder moved over, but it didn't fall! I wonder what we forgot? Oh - I know! we made the boulder slip off the ledge, but we never programmed it to fall down!`,
  },
  {
    pose: "standing-confused",
    text: `In the real world, gravity makes everything fall down. In our game, we need to program things to fall. Maybe next time we can make a space game and we won't need gravity!`,
  },
  {
    pose: "standing-pointing",
    text: `Switch to the recording tool again and click the boulder. Let's give it a gravity rule!`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => {
        return (
          state.ui.selectedToolId === TOOLS.RECORD &&
          state.recording.characterId === LESSON_CHARACTER_IDS.boulder
        );
      },
    },
  },
  {
    pose: ["standing-confused", "standing-pointing"],
    text: `Perfect. Let's think about this for a minute.. We want our boulder to fall whenever there's an empty square beneath it. Can you expand the box to include the empty space beneath the boulder?`,
    annotation: { selectors: ["[data-stage-handle=bottom]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.ymax - state.recording.extent.ymin > 0,
    },
  },
  {
    pose: "excited",
    text: `Nice. Now we're ready to show the boulder what to do.`,
  },
  {
    pose: "standing-pointing",
    text: `In the picture on the right, drag the boulder down into the empty space just beneath it.`,
    waitsFor: {
      stateMatching: (state) => {
        const after = getCurrentStageForWorld(state.recording.afterWorld);
        if (!after) {
          return false;
        }
        const boulder = boulderIn(after);
        return boulder && boulder.position.y < BOULDER_START.y;
      },
    },
  },
  {
    pose: "folded-talking",
    text: `Nice! The boulder will fall down until it reaches the ground. Once it's on the ground the picture on the left won't match - there won't be any empty space for it to fall into!`,
  },
  {
    pose: "standing-pointing",
    text: `Click 'Done' and let's try out your new rule.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-next-step]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => state.recording.characterId === null,
    },
  },
  {
    pose: "sitting-talking",
    text: `Okay let's try playing it again. This time when our hero walks toward the ledge, the boulder should slip off and fall! Can you get him past the boulder before it blocks his path?`,
    onEnter: (dispatch) => {
      dispatch(changeActors(boulderPath, { position: BOULDER_START }));
      dispatch(changeActors(heroPath, { position: HERO_START }));
    },
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const hero = heroIn(stage);
        return hero && hero.position.x > BOULDER_LANDING_COLUMN;
      },
    },
  },
  {
    pose: "sitting-talking",
    text: `That was pretty cool, huh? I don't really know what we should do next. Why don't you make your own rules! You could make our hero jump over the boulder or teach him to dig into the dirt, or create a whole new game piece!`,
  },
];
