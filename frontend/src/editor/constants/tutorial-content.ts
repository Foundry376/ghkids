/**
 * Tutorial step content with full metadata.
 * Text is imported from tutorial-audio-data.ts - edit text there, not here.
 *
 * To regenerate audio after changing text:
 *   yarn generate-tutorial-audio
 */

import { Dispatch } from "redux";
import { EditorState, Stage } from "../../types";
import { Actions } from "../actions";
import { changeActors } from "../actions/stage-actions";
import { stopPlayback } from "../actions/ui-actions";
import { TutorialAnnotationProps } from "../components/tutorial/annotation";
import { PoseKey } from "../components/tutorial/girl";
import { getCurrentStageForWorld } from "../utils/selectors";
import { RECORDING_PHASE, TOOLS } from "./constants";
import {
  baseTutorialAudioData,
  forkTutorialAudioData,
  TutorialAudioStep,
} from "./tutorial-audio-data";

export const poseFrames = {
  "sitting-looking": ["sitting-looking"],
  "sitting-talking": [
    "sitting-talking-1",
    "sitting-talking-2",
    "sitting-talking-4",
    "sitting-talking-5",
  ],
  "standing-pointing": ["standing-pointing"],
  "standing-talking": ["standing-talking-1", "standing-talking-2", "standing-talking-3"],
  "standing-confused": ["standing-confused-1", "standing-confused-2"],
  ashamed: ["ashamed", "ashamed-blink"],
  excited: ["excited", "excited-blink"],
  "folded-talking": [
    "folded-talking-1",
    "folded-talking-2",
    "folded-talking-3",
    "folded-talking-4",
  ],
};

const baseTutorialCharacterPath = {
  worldId: "root",
  stageId: "root",
  actorIds: ["1483668698770"],
};
const baseTutorialBoulderPath = {
  worldId: "root",
  stageId: "root",
  actorIds: ["1483691260895"],
};

export type TutorialStepContent = {
  pose: PoseKey | PoseKey[];
  text: string;
  audioFile?: string;
  onEnter?: (dispatch: Dispatch<Actions>) => void;
  annotation?: TutorialAnnotationProps;
  waitsFor?: {
    button?: string;
    elementMatching?: string;
    stateMatching?: (state: EditorState, stage: Stage) => boolean | undefined;
    delay?: number;
  };
};

/** Helper to get text and audioFile from the audio data array */
function getAudioData(data: TutorialAudioStep[], index: number): Pick<TutorialStepContent, "text" | "audioFile"> {
  const step = data[index];
  if (!step) {
    throw new Error(`Tutorial audio data missing at index ${index}`);
  }
  return { text: step.text, audioFile: step.audioFile };
}

// Helper to shorten the code below
const base = (i: number) => getAudioData(baseTutorialAudioData, i);

export const baseTutorialContent: TutorialStepContent[] = [
  {
    pose: "sitting-talking",
    ...base(0),
    annotation: {
      selectors: [".tutorial-container button.btn-primary"],
      style: "outline",
    },
    waitsFor: {
      button: "Start Lesson: Playback",
    },
  },

  // LESSON 1: Starting, playing basic game

  {
    pose: ["standing-pointing", "standing-talking"],
    ...base(1),
    annotation: {
      selectors: ["[data-tutorial-id=controls]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(2),
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.ui.playback.running === true,
    },
  },
  {
    pose: "standing-talking",
    ...base(3),
    waitsFor: {
      stateMatching: (state) => Object.keys(state.world.input.keys).length > 0,
      delay: 7000,
    },
  },
  {
    pose: ["ashamed", "folded-talking"],
    ...base(4),
    annotation: {
      selectors: [".tutorial-container button.btn-primary"],
      style: "outline",
    },
    waitsFor: {
      button: "Start Lesson: Creating a Bridge",
    },
  },

  // LESSON 2: Adding a character

  {
    pose: "standing-pointing",
    ...base(5),
    annotation: { selectors: [".stages-horizontal-flex"], style: "outline" },
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    ...base(6),
    annotation: {
      selectors: ["[data-tutorial-id=characters]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(7),
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
    ...base(8),
    annotation: {
      selectors: ["[data-tutorial-id=paint-tools]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(9),
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
    ...base(10),
    annotation: {
      selectors: ["[data-tutorial-id=characters] .item:last-child"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(11),
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-trash]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(12),
    annotation: {
      selectors: [".stages-horizontal-flex .background"],
      style: "outline",
      options: {
        width: 40 * 5,
        height: 34,
        offsetTop: 40 * 10 + 6,
        offsetLeft: 40 * 4,
      },
    },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const counts: { [characterId: string]: number } = {};
        Object.values(stage.actors).forEach((a) => {
          counts[a.characterId] = counts[a.characterId] ? counts[a.characterId] + 1 : 1;
        });
        return Object.values(counts).some((v) => v === 5);
      },
    },
  },
  {
    pose: "standing-pointing",
    ...base(13),
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (_state, stage) => {
        return Object.values(stage.actors).some(
          (a) => a.characterId === "aamlcui8uxr" && a.position.x === 9
        );
      },
    },
  },
  {
    pose: ["excited", "standing-confused", "standing-pointing"],
    ...base(14),
    annotation: {
      selectors: [".tutorial-container button.btn-primary"],
      style: "outline",
    },
    waitsFor: {
      button: "Start Lesson: Recording a Rule",
    },
  },

  // LESSON 3: Creating a new rule

  {
    pose: ["folded-talking", "standing-pointing"],
    ...base(15),
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
      dispatch(changeActors(baseTutorialCharacterPath, { position: { x: 9, y: 9 } }));
    },
    waitsFor: {
      stateMatching: (state) => state.ui.selectedToolId === "record",
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    ...base(16),
    annotation: {
      selectors: ["[data-stage-character-id=aamlcui8uxr]"],
      style: "outline",
    },
    onEnter: (dispatch) => {
      dispatch(changeActors(baseTutorialCharacterPath, { position: { x: 9, y: 9 } }));
    },
    waitsFor: {
      stateMatching: (state) => state.recording.actorId === baseTutorialCharacterPath.actorIds[0]!,
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    ...base(17),
  },
  {
    pose: ["standing-pointing", "sitting-talking"],
    ...base(18),
    annotation: { selectors: ["[data-stage-handle=right]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.xmax - state.recording.extent.xmin > 0,
    },
  },
  {
    pose: "standing-pointing",
    ...base(19),
    annotation: { selectors: ["[data-stage-handle=top]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.ymax - state.recording.extent.ymin > 0,
    },
  },
  {
    pose: ["excited", "standing-pointing"],
    ...base(20),
  },
  {
    pose: "sitting-talking",
    ...base(21),
    annotation: {
      selectors: ["[data-stage-wrap-id=before]"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(22),
    annotation: { selectors: ["[data-stage-wrap-id=after]"], style: "outline" },
  },
  {
    pose: "standing-pointing",
    ...base(23),
    waitsFor: {
      stateMatching: ({ recording }) => {
        const beforeStage = getCurrentStageForWorld(recording.beforeWorld);
        const afterStage = getCurrentStageForWorld(recording.afterWorld);
        if (!beforeStage || !afterStage) {
          return false;
        }
        const before = Object.values(beforeStage.actors).find(
          (a) => a.characterId === "aamlcui8uxr"
        );
        const after = Object.values(afterStage.actors).find((a) => a.characterId === "aamlcui8uxr");
        return (
          before &&
          after &&
          after.position.x === before.position.x + 1 &&
          after.position.y === before.position.y - 1
        );
      },
    },
  },
  {
    pose: "sitting-talking",
    ...base(24),
    annotation: {
      selectors: [".recording-specifics .panel-actions li"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(25),
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
    ...base(26),
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    onEnter: (dispatch) => {
      dispatch(changeActors(baseTutorialCharacterPath, { position: { x: 2, y: 9 } }));
    },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const main = Object.values(stage.actors).find((a) => a.characterId === "aamlcui8uxr");
        return main && main.position.x > 9;
      },
    },
  },
  {
    pose: ["excited", "sitting-talking", "sitting-talking"],
    ...base(27),
  },
  {
    pose: "standing-confused",
    ...base(28),
    annotation: {
      selectors: [".tutorial-container button.btn-primary"],
      style: "outline",
    },
    waitsFor: {
      button: "Start Lesson: Event Containers",
    },
  },
  {
    pose: "standing-pointing",
    ...base(29),
    annotation: {
      selectors: ["[data-stage-character-id=aamlcui8uxr]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => state.ui.selectedCharacterId === "aamlcui8uxr",
    },
  },
  {
    pose: ["standing-pointing", "standing-talking", "folded-talking"],
    ...base(30),
    annotation: {
      style: "arrow",
      selectors: [
        ".scroll-container-contents > .rules-list > li:first-child",
        ".scroll-container-contents > .rules-list > li:last-child",
      ],
    },
    waitsFor: {
      delay: 3000,
    },
  },
  {
    pose: ["standing-talking", "folded-talking", "standing-talking"],
    ...base(31),
  },
  {
    pose: ["standing-pointing", "folded-talking"],
    ...base(32),
    annotation: {
      selectors: [".rule-container.group-event:first-child"],
      style: "outline",
    },
  },
  {
    pose: ["standing-pointing", "folded-talking"],
    ...base(33),
    annotation: {
      selectors: [".rule-container:first-child .header .name"],
      style: "outline",
    },
  },
  {
    pose: ["standing-confused", "folded-talking"],
    ...base(34),
  },
  {
    pose: "standing-pointing",
    ...base(35),
    annotation: {
      selectors: ["[data-tutorial-id=inspector-add-rule]"],
      style: "outline",
    },
    waitsFor: {
      elementMatching: ".btn-group.open [data-tutorial-id=inspector-add-rule-key]",
    },
  },
  {
    pose: "standing-pointing",
    ...base(36),
    annotation: {
      selectors: [".btn-group.open [data-tutorial-id=inspector-add-rule-key]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => !!state.ui.keypicker.open,
    },
  },
  {
    pose: "standing-pointing",
    ...base(37),
    annotation: {
      selectors: ["[data-tutorial-id=keypicker-done]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => !state.ui.keypicker.open,
    },
  },
  {
    pose: ["excited", "sitting-talking"],
    ...base(38),
    annotation: {
      selectors: [".rule-container.group-event:first-child"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    ...base(39),
    annotation: {
      style: "arrow",
      selectors: [
        ".rule-container.group-event:last-child .rule:first-child",
        ".rule-container.group-event:first-child .rules-list",
      ],
    },
  },
  {
    pose: "standing-pointing",
    ...base(40), // No audio - continuation step
    waitsFor: {
      elementMatching: ".rule-container.group-event:first-child li",
    },
  },
  {
    pose: ["excited", "sitting-talking"],
    ...base(41),
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
    },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const main = Object.values(stage.actors).find((a) => a.characterId === "aamlcui8uxr");
        return main && main.position.x < 9;
      },
    },
  },
  {
    pose: "standing-pointing",
    ...base(42),
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const main = Object.values(stage.actors).find((a) => a.characterId === "aamlcui8uxr");
        return main && main.position.x > 9;
      },
    },
  },
  {
    pose: "excited",
    ...base(43),
    annotation: {
      selectors: [".tutorial-container button.btn-primary"],
      style: "outline",
    },
    waitsFor: {
      button: "Start Lesson: Falling Boulder",
    },
  },
  {
    pose: "folded-talking",
    ...base(44),
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
    },
  },
  {
    pose: "folded-talking",
    ...base(45),
    onEnter: (dispatch) => {
      dispatch(changeActors(baseTutorialCharacterPath, { position: { x: 12, y: 9 } }));
    },
  },
  {
    pose: "standing-pointing",
    ...base(46),
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => {
        return (
          state.ui.selectedToolId === TOOLS.RECORD &&
          state.recording.phase === RECORDING_PHASE.RECORD &&
          state.recording.characterId === "oou4u6jemi"
        );
      },
    },
  },
  {
    pose: ["standing-confused", "sitting-talking"],
    ...base(47),
    waitsFor: {
      stateMatching: (state, stage) => {
        const main = Object.values(stage.actors).find((a) => a.characterId === "aamlcui8uxr");
        return (
          main &&
          state.recording.extent.xmin <= main.position.x &&
          state.recording.extent.ymax >= main.position.y
        );
      },
    },
  },
  {
    pose: "excited",
    ...base(48),
  },
  {
    pose: "standing-pointing",
    ...base(49),
    waitsFor: {
      stateMatching: (state) => {
        const after = getCurrentStageForWorld(state.recording.afterWorld);
        if (!after) {
          return false;
        }
        const boulder = Object.values(after.actors).find((a) => a.characterId === "oou4u6jemi");
        return boulder && boulder.position.x < 14;
      },
    },
  },
  {
    pose: "standing-pointing",
    ...base(50),
  },
  {
    pose: "standing-pointing",
    ...base(51),
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
    ...base(52),
    onEnter: (dispatch) => {
      dispatch(changeActors(baseTutorialBoulderPath, { position: { x: 14, y: 5 } }));
      dispatch(changeActors(baseTutorialCharacterPath, { position: { x: 9, y: 9 } }));
    },
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (state, stage) => {
        const boulder = Object.values(stage.actors).find((a) => a.characterId === "oou4u6jemi");
        return state.ui.playback.running === true && boulder && boulder.position.x < 14;
      },
    },
  },
  {
    pose: "standing-confused",
    ...base(53),
  },
  {
    pose: "standing-confused",
    ...base(54),
  },
  {
    pose: "standing-pointing",
    ...base(55),
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => {
        return (
          state.ui.selectedToolId === TOOLS.RECORD &&
          state.recording.phase === RECORDING_PHASE.RECORD &&
          state.recording.characterId === "oou4u6jemi"
        );
      },
    },
  },
  {
    pose: ["standing-confused", "standing-pointing"],
    ...base(56),
    annotation: { selectors: ["[data-stage-handle=bottom]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) => state.recording.extent.ymax - state.recording.extent.ymin > 0,
    },
  },
  {
    pose: "excited",
    ...base(57),
  },
  {
    pose: "standing-pointing",
    ...base(58),
    waitsFor: {
      stateMatching: (state) => {
        const after = getCurrentStageForWorld(state.recording.afterWorld);
        if (!after) {
          return false;
        }
        const boulder = Object.values(after.actors).find((a) => a.characterId === "oou4u6jemi");
        return boulder && boulder.position.y > 5;
      },
    },
  },
  {
    pose: "folded-talking",
    ...base(59),
  },
  {
    pose: "standing-pointing",
    ...base(60),
    annotation: {
      selectors: ["[data-tutorial-id=record-next-step]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => state.recording.characterId === null,
    },
  },
  {
    ...base(61),
    pose: "sitting-talking",
    onEnter: (dispatch) => {
      dispatch(changeActors(baseTutorialBoulderPath, { position: { x: 14, y: 5 } }));
      dispatch(changeActors(baseTutorialCharacterPath, { position: { x: 2, y: 9 } }));
    },
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const main = Object.values(stage.actors).find((a) => a.characterId === "aamlcui8uxr");
        return main && main.position.x > 13;
      },
    },
  },
  {
    pose: "sitting-talking",
    ...base(62),
  },
  {
    pose: "sitting-looking",
    ...base(63),
    annotation: {
      selectors: ["[data-tutorial-id=main-menu]"],
      style: "outline",
    },
    waitsFor: {
      button: "End Tutorial",
    },
  },
];

// Helper for fork tutorial
const fork = (i: number) => getAudioData(forkTutorialAudioData, i);

export const forkTutorialContent: TutorialStepContent[] = [
  {
    pose: "sitting-talking",
    ...fork(0),
    annotation: {
      selectors: [".tutorial-container button.btn-primary"],
      style: "outline",
    },
    waitsFor: {
      button: "Start Lesson: Walkthrough",
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    ...fork(1),
    annotation: {
      selectors: ["[data-tutorial-id=controls]"],
      style: "outline",
    },
    waitsFor: {
      button: "Next",
    },
  },
  {
    pose: ["standing-pointing", "standing-talking"],
    ...fork(2),
    annotation: {
      selectors: ["[data-tutorial-id=characters]"],
      style: "outline",
    },
    waitsFor: {
      button: "Next",
    },
  },
  {
    pose: "standing-pointing",
    ...fork(3),
    annotation: { selectors: [".stages-horizontal-flex"], style: "outline" },
    waitsFor: {
      button: "Next",
    },
  },
  {
    pose: ["folded-talking", "standing-pointing"],
    ...fork(4),
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    waitsFor: {
      button: "Next",
    },
  },
  {
    pose: ["folded-talking", "standing-pointing"],
    ...fork(5),
    annotation: {
      selectors: ["[data-tutorial-id=undo-button]"],
      style: "outline",
    },
  },
  {
    ...fork(6),
    annotation: {
      selectors: ["[data-tutorial-id=main-menu]"],
      style: "outline",
    },
    waitsFor: {
      button: "End Walkthrough",
    },
    pose: "sitting-talking",
  },
];

export const tutorialContent = {
  base: baseTutorialContent,
  fork: forkTutorialContent,
};
