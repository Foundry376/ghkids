/**
 * Walkthrough step content - the source of truth for spoken text and behavior.
 *
 * This file holds the pieces shared by every walkthrough plus the fork
 * walkthrough itself (the tour shown when a kid copies someone else's game).
 * The lessons are in ./lessons, one file each.
 *
 * Audio filenames are generated from a hash of the text content, so changing
 * text will automatically reference a new audio file. To regenerate audio:
 *   cd scripts && yarn install && ELEVENLABS_API_KEY=your_key yarn generate-tutorial-audio
 *
 * Both this file and the generation script use the same hash function from
 * utils/text-hash.ts to ensure consistent filename generation.
 */

import { Dispatch } from "redux";
import { EditorState, Stage } from "../../types";
import { Actions } from "../actions";
import { TutorialAnnotationProps } from "../components/tutorial/annotation";
import { PoseKey } from "../components/tutorial/girl";

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

export type TutorialStepContent = {
  pose: PoseKey | PoseKey[];
  text: string;
  /** Set to true for steps that shouldn't have audio (e.g., wait/continuation steps) */
  skipAudio?: boolean;
  onEnter?: (dispatch: Dispatch<Actions>) => void;
  annotation?: TutorialAnnotationProps;
  waitsFor?: {
    button?: string;
    elementMatching?: string;
    stateMatching?: (state: EditorState, stage: Stage) => boolean | undefined;
    delay?: number;
  };
};

export const forkTutorialContent: TutorialStepContent[] = [
  {
    pose: "sitting-talking",
    text: `Hi there! I've copied this game to your account so you can edit it as much as you want. Want me to show you around?`,
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
    text: `These buttons start and stop the game. When you play normal games you can't pause and rewind, but Codako let's you write our own games! Rewinding makes it easier to see what's happening when the game doesn't work the way you expect it to.`,
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
    text: `This is the character library. It shows all of the game pieces we've made. You can draw your own or add existing ones by clicking the "+" icon.`,
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
    text: `This is the stage - it's where we design our game world. You can drag and drop pieces around, and add new ones by dragging them from the character library.`,
    annotation: { selectors: [".stages-horizontal-flex"], style: "outline" },
    waitsFor: {
      button: "Next",
    },
  },
  {
    pose: ["folded-talking", "standing-pointing"],
    text: `Rules define how the game works. You can double-click a character to see it's rules, and create new rules by choosing the recording tool in the toolbar and then clicking a piece on the stage.`,
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
    text: `Go ahead and try changing the game! If you make a mistake, you can undo any change by pressing the Undo button.`,
    annotation: {
      selectors: ["[data-tutorial-id=undo-button]"],
      style: "outline",
    },
  },
  {
    pose: "sitting-talking",
    text: `For more learning resources, look in the main menu.`,
    annotation: {
      selectors: ["[data-tutorial-id=main-menu]"],
      style: "outline",
    },
    waitsFor: {
      button: "End Walkthrough",
    },
  },
];
