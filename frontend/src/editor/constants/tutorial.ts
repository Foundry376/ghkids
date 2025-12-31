/**
 * Tutorial steps with sound URLs.
 * Text content is defined in tutorial-content.ts - edit text there, not here.
 *
 * To regenerate audio after changing text:
 *   yarn generate-tutorial-audio
 */

import { Dispatch } from "redux";
import { EditorState, Stage } from "../../types";
import { Actions } from "../actions";
import { TutorialAnnotationProps } from "../components/tutorial/annotation";
import { PoseKey } from "../components/tutorial/girl";
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
 */
function contentToSteps(content: TutorialStepContent[], audioPath: string): TutorialStep[] {
  return content.map((step) => {
    const { audioFile, ...rest } = step;
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
