/**
 * Tutorial steps with sound URLs.
 * Text content is defined in tutorial-content.ts - edit text there, not here.
 *
 * Audio filenames are automatically generated from a hash of the text content.
 * To regenerate audio after changing text:
 *   cd scripts && yarn install && ELEVENLABS_API_KEY=your_key yarn generate-tutorial-audio
 */

import { Dispatch } from "redux";
import { EditorState, Stage } from "../../types";
import { Actions } from "../actions";
import { TutorialAnnotationProps } from "../components/tutorial/annotation";
import { PoseKey } from "../components/tutorial/girl";
import { getAudioFilename } from "../utils/text-hash";
import {
  baseTutorialContent,
  forkTutorialContent,
  poseFrames,
  TutorialStepContent,
} from "./tutorial-content";

// Re-export poseFrames for backwards compatibility
export { poseFrames };

export type TutorialStep = {
  pose: PoseKey | PoseKey[];
  text: string;
  soundURL?: string;
  onEnter?: (dispatch: Dispatch<Actions>) => void;
  annotation?: TutorialAnnotationProps;
  waitsFor?: {
    button?: string;
    elementMatching?: string;
    stateMatching?: (state: EditorState, stage: Stage) => boolean | undefined;
    delay?: number;
  };
};

/**
 * Convert tutorial content to tutorial steps by adding sound URLs.
 * Audio filenames are generated from a hash of the text content.
 */
function contentToSteps(content: TutorialStepContent[], audioPath: string): TutorialStep[] {
  return content.map((step) => {
    const { skipAudio, ...rest } = step;
    const audioFile = skipAudio ? undefined : getAudioFilename(step.text);
    return {
      ...rest,
      soundURL: audioFile ? new URL(`${audioPath}${audioFile}`, import.meta.url).href : undefined,
    };
  });
}

const baseTutorialSteps = contentToSteps(baseTutorialContent, "../sounds/tutorial/");
const forkTutorialSteps = contentToSteps(forkTutorialContent, "../sounds/tutorial/");

export const tutorialSteps = {
  base: baseTutorialSteps,
  fork: forkTutorialSteps,
};
