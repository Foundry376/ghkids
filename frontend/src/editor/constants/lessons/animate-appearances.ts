import { changeActors } from "../../actions/stage-actions";
import { stopPlayback } from "../../actions/ui-actions";
import { EditorState, RecordingState } from "../../../types";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { TOOLS } from "../constants";
import { TutorialStepContent } from "../tutorial-content";
import { birdIn, birdPath, LESSON_CHARACTER_IDS } from "./characters";

/**
 * Lesson 6 - Animate Appearances.
 *
 * A bird alone in a sky that wraps around, with one appearance: wings up. The
 * kid paints a second, wings-down appearance, then records two rules that each
 * move the bird one square forward and swap it to the other picture. Together
 * they make it flap across the sky.
 *
 * The appearance condition the lesson is about is added by the recorder, not
 * the kid: clicking an actor with the record tool starts the rule with "this
 * actor's appearance is <what it looks like now>". So the lesson plays the
 * first rule once to leave the bird wings-down, and records the second rule
 * from there - which is also the moment it can show why the condition matters.
 */
const BIRD_START = { x: 2, y: 5 };
/** The appearance the bird starts with. The one the kid paints gets a generated id. */
const WINGS_UP = "wings-up";
/** How far the bird should get once both rules work, before we call it flying. */
const FLYING_COLUMN = BIRD_START.x + 5;
/** The bird in the recording's right-hand picture, where appearances get dropped. */
const AFTER_BIRD = `[data-stage-wrap-id=after] [data-stage-character-id=${LESSON_CHARACTER_IDS.bird}]`;

/** The appearance the kid painted, whatever it ended up being called. */
function wingsDownIn(state: EditorState): string | undefined {
  const bird = state.characters[LESSON_CHARACTER_IDS.bird];
  return bird && Object.keys(bird.spritesheet.appearances).find((id) => id !== WINGS_UP);
}

/** The bird in the recording's before and after pictures. */
function recordedBird(recording: RecordingState) {
  const before = getCurrentStageForWorld(recording.beforeWorld);
  const after = getCurrentStageForWorld(recording.afterWorld);
  return {
    before: before ? birdIn(before) : undefined,
    after: after ? birdIn(after) : undefined,
  };
}

const movedOneSquareForward = (recording: RecordingState) => {
  const { before, after } = recordedBird(recording);
  return (
    !!before &&
    !!after &&
    after.position.x === before.position.x + 1 &&
    after.position.y === before.position.y
  );
};

/** The appearance the recorder made this rule's condition out of. */
const recordedCondition = (recording: RecordingState) => {
  const condition = recording.conditions.find((c) => c.key === "main-actor-appearance");
  return condition && "constant" in condition.right ? condition.right.constant : undefined;
};

export const animateAppearancesLessonContent: TutorialStepContent[] = [
  {
    pose: "folded-talking",
    text: `Meet our bird! Right now it only has one picture, with its wings up. To make it look like it's flying, we need a second picture with its wings down.`,
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
      dispatch(changeActors(birdPath, { position: BIRD_START, appearance: WINGS_UP }));
    },
  },
  {
    pose: "standing-pointing",
    text: `Click the bird in the character library.`,
    annotation: {
      selectors: [`[data-tutorial-id=characters] .item:last-child`],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => state.ui.selectedCharacterId === LESSON_CHARACTER_IDS.bird,
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    text: `These are the bird's appearances - all the different pictures it can show. Click the + button to add a new one.`,
    annotation: {
      selectors: ["[data-tutorial-id=appearances-add-button]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) =>
        state.ui.paint.characterId === LESSON_CHARACTER_IDS.bird &&
        !!state.ui.paint.appearanceId &&
        state.ui.paint.appearanceId !== WINGS_UP,
      delay: 2000,
    },
  },
  {
    pose: "standing-pointing",
    text: `The new picture starts as a copy of the old one. Use the eraser to rub out the wing on top, then use the pencil to draw a wing pointing down.`,
    annotation: {
      selectors: ["[data-tutorial-id=paint-tools]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `When your bird's wings are down, click the blue Done button.`,
    annotation: {
      selectors: ["[data-tutorial-id=paint-save-and-close]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => !state.ui.paint.characterId,
    },
  },
  {
    pose: ["excited", "standing-pointing"],
    text: `Now our bird has two appearances! Let's give the new one a name. Click the word 'untitled' under it and call it 'Wings Down'.`,
    annotation: {
      selectors: ["[data-tutorial-id=appearances] .item:last-child"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => {
        const id = wingsDownIn(state);
        const names = state.characters[LESSON_CHARACTER_IDS.bird]?.spritesheet.appearanceNames;
        return !!id && !!names?.[id] && names[id] !== "untitled";
      },
    },
  },
  {
    pose: ["folded-talking", "standing-pointing"],
    text: `Now let's teach the bird to flap its wings. Click the recording tool in the toolbar.`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    onEnter: (dispatch) => {
      dispatch(changeActors(birdPath, { position: BIRD_START, appearance: WINGS_UP }));
    },
    waitsFor: {
      stateMatching: (state) =>
        state.ui.selectedToolId === TOOLS.RECORD || state.recording.actorId === "bird",
    },
  },
  {
    pose: "standing-pointing",
    text: `Now click on the bird up in the sky.`,
    annotation: {
      selectors: [`[data-stage-character-id=${LESSON_CHARACTER_IDS.bird}]`],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => state.recording.actorId === birdPath.actorIds[0]!,
    },
  },
  {
    pose: ["sitting-talking", "standing-pointing"],
    text: `Look down here! Codako already added a check to our rule: the bird's appearance has to be Wings Up. This rule will only work when the bird's wings are up.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-conditions]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `The bird needs an empty space to fly into. Drag the right handle over by one square.`,
    annotation: { selectors: ["[data-stage-handle=right]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.xmax - state.recording.extent.xmin > 0,
    },
  },
  {
    pose: "standing-pointing",
    text: `Now show the bird what to do. In the picture on the right, drag the bird one square forward into the empty space.`,
    annotation: { selectors: ["[data-stage-wrap-id=after]"], style: "outline" },
    waitsFor: {
      stateMatching: ({ recording }) => movedOneSquareForward(recording),
    },
  },
  {
    pose: "standing-pointing",
    text: `Next, drag the Wings Down picture from the Appearances panel onto the bird in the picture on the right.`,
    annotation: {
      selectors: ["[data-tutorial-id=appearances] .item:last-child", AFTER_BIRD],
      style: "arrow",
    },
    waitsFor: {
      stateMatching: ({ recording }) => {
        const { after } = recordedBird(recording);
        return !!after && after.appearance !== WINGS_UP;
      },
    },
  },
  {
    pose: "sitting-talking",
    text: `See the two instructions? When its wings are up, the bird will move forward and switch to its wings-down picture.`,
    annotation: {
      selectors: [".recording-specifics .panel-actions"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `Click 'Done' to save the rule.`,
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
    text: `Press 'Play' and watch the bird!`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    onEnter: (dispatch) => {
      dispatch(changeActors(birdPath, { position: BIRD_START, appearance: WINGS_UP }));
    },
    waitsFor: {
      stateMatching: (state, stage) => {
        const bird = birdIn(stage);
        return state.ui.playback.running && !!bird && bird.appearance !== WINGS_UP;
      },
      delay: 2500,
    },
  },
  {
    pose: "standing-confused",
    text: `Hmm... it flapped once and then stopped! Our rule only works when the bird's wings are up - and now they're down. We need a second rule for when the wings are down.`,
  },
  {
    pose: "standing-pointing",
    text: `Click the recording tool again, and then click the bird. This time its wings are down.`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
      // Normally playing left it wings-down already, but make sure: the
      // recorder builds this rule's condition from what the bird looks like.
      const down = wingsDownIn(window.editorStore!.getState() as EditorState);
      if (down) {
        dispatch(changeActors(birdPath, { appearance: down }));
      }
    },
    waitsFor: {
      stateMatching: ({ recording }) =>
        recording.actorId === birdPath.actorIds[0]! &&
        recordedCondition(recording) !== undefined &&
        recordedCondition(recording) !== WINGS_UP,
    },
  },
  {
    pose: "sitting-talking",
    text: `See? This time the check says the bird's appearance has to be Wings Down.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-conditions]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `Drag the right handle over by one square again, so the bird has room to fly.`,
    annotation: { selectors: ["[data-stage-handle=right]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.xmax - state.recording.extent.xmin > 0,
    },
  },
  {
    pose: "standing-pointing",
    text: `In the picture on the right, drag the bird one square forward.`,
    annotation: { selectors: ["[data-stage-wrap-id=after]"], style: "outline" },
    waitsFor: {
      stateMatching: ({ recording }) => movedOneSquareForward(recording),
    },
  },
  {
    pose: "standing-pointing",
    text: `Now drag the Wings Up picture onto the bird, so its wings go back up.`,
    annotation: {
      selectors: ["[data-tutorial-id=appearances] .item:first-child", AFTER_BIRD],
      style: "arrow",
    },
    waitsFor: {
      stateMatching: ({ recording }) => {
        const { after } = recordedBird(recording);
        return !!after && after.appearance === WINGS_UP;
      },
    },
  },
  {
    pose: "standing-pointing",
    text: `Click 'Done' to save your second rule.`,
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
    text: `Press 'Play' again! Now the bird has a rule for when its wings are up, and a rule for when its wings are down.`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
      dispatch(changeActors(birdPath, { position: BIRD_START, appearance: WINGS_UP }));
    },
    waitsFor: {
      stateMatching: (state, stage) => {
        const bird = birdIn(stage);
        return state.ui.playback.running && !!bird && bird.position.x >= FLYING_COLUMN;
      },
    },
  },
  {
    pose: ["excited", "sitting-talking"],
    text: `It's flying! Each rule checks which picture the bird is showing, moves it forward, and switches to the other picture. Switching back and forth between two pictures is how you make an animation!`,
  },
];
