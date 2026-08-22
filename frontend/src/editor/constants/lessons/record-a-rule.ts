import { changeActors } from "../../actions/stage-actions";
import { stopPlayback } from "../../actions/ui-actions";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { TutorialStepContent } from "../tutorial-content";
import { heroIn, heroPath, LESSON_CHARACTER_IDS } from "./characters";

/**
 * Lesson 3 - Record a Rule.
 *
 * Flat ground with a single boulder between the hero and the exit. The kid
 * records the rule that teaches the hero to climb it. Lesson 4 picks up in the
 * same world with that rule already recorded.
 */
const HERO_START = { x: 2, y: 4 };
/** Beside the boulder at x=10, which is where the rule gets recorded. */
const HERO_BESIDE_BOULDER = { x: 9, y: 4 };
const BOULDER_COLUMN = 10;

export const recordARuleLessonContent: TutorialStepContent[] = [
  {
    pose: ["folded-talking", "standing-pointing"],
    text: `In Codako, rules define how the game works. Click the recording tool in the toolbar. We'll create a new rule that teaches our hero how to climb a boulder.`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
      dispatch(changeActors(heroPath, { position: HERO_BESIDE_BOULDER }));
    },
    waitsFor: {
      stateMatching: (state) => state.ui.selectedToolId === "record",
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    text: `Okay, now click on our hero - we want to show him how to climb, so this rule is for him.`,
    annotation: {
      selectors: [`[data-stage-character-id=${LESSON_CHARACTER_IDS.hero}]`],
      style: "outline",
    },
    onEnter: (dispatch) => {
      dispatch(changeActors(heroPath, { position: HERO_BESIDE_BOULDER }));
    },
    waitsFor: {
      stateMatching: (state) => state.recording.actorId === heroPath.actorIds[0]!,
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    text: `Perfect. See how the stage has been grayed out? When we're showing our hero a new rule, it's important to tell him what to pay attention to.`,
  },
  {
    pose: ["standing-pointing", "sitting-talking"],
    text: `These handles let us expand the area our hero will look at. For this rule, it's important that there's a rock in front of him! Drag the right handle so it includes the rock he has to climb.`,
    annotation: { selectors: ["[data-stage-handle=right]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.xmax - state.recording.extent.xmin > 0,
    },
  },
  {
    pose: "standing-pointing",
    text: `Great! Go ahead and drag the top handle up by one square, too. Since we're going to teach him to climb, he needs to make sure he has space above him.`,
    annotation: { selectors: ["[data-stage-handle=top]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.ymax - state.recording.extent.ymin > 0,
    },
  },
  {
    pose: ["excited", "standing-pointing"],
    text: `Perfect. Now we're ready to show our hero what to do!`,
  },
  {
    pose: "sitting-talking",
    text: `Whenever our hero is walking around, he'll look at the picture on the left and see if his surroundings are the same.`,
    annotation: {
      selectors: ["[data-stage-wrap-id=before]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `If they are, he'll follow the instructions we give him on the right!`,
    annotation: { selectors: ["[data-stage-wrap-id=after]"], style: "outline" },
  },
  {
    pose: "standing-pointing",
    text: `To tell our hero to climb, click and drag him up one square and over one square, so he's standing on top of the rock.`,
    waitsFor: {
      stateMatching: ({ recording }) => {
        const beforeStage = getCurrentStageForWorld(recording.beforeWorld);
        const afterStage = getCurrentStageForWorld(recording.afterWorld);
        if (!beforeStage || !afterStage) {
          return false;
        }
        const before = heroIn(beforeStage);
        const after = heroIn(afterStage);
        return (
          before &&
          after &&
          after.position.x === before.position.x + 1 &&
          after.position.y === before.position.y + 1
        );
      },
    },
  },
  {
    pose: "sitting-talking",
    text: `Great! See how that created an instruction? Now he knows what he should do!`,
    annotation: {
      selectors: [".recording-specifics .panel-actions li"],
      style: "outline",
    },
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
    pose: "standing-pointing",
    text: `Press 'Play'! If we did it right, our hero should climb the block now.`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    onEnter: (dispatch) => {
      dispatch(changeActors(heroPath, { position: HERO_START }));
    },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const hero = heroIn(stage);
        return hero && hero.position.x > BOULDER_COLUMN;
      },
    },
  },
  {
    pose: ["excited", "sitting-talking", "sitting-talking"],
    text: `Wow that was great! We taught the hero how to climb up over the rock. Now we can use the arrow keys to get him to the exit.`,
  },
  {
    pose: "standing-confused",
    text: `Hmm... Since we're making a game we should probably make our hero wait to climb until you press the space bar. Want to help me change that?`,
  },
];
