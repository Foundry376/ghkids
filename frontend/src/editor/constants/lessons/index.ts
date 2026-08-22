import { TutorialStepContent } from "../tutorial-content";
import { drawACharacterLessonContent } from "./draw-a-character";
import { eventBlocksLessonContent } from "./event-blocks";
import { fallingBoulderLessonContent } from "./falling-boulder";
import { playbackLessonContent } from "./playback";
import { recordARuleLessonContent } from "./record-a-rule";

/**
 * The walkthrough steps for each lesson, keyed by the slug in
 * frontend/src/lessons/lessons.ts. The two halves are separate on purpose: the
 * lesson index page needs titles and worlds without pulling in editor code.
 */
export const lessonContent: Record<string, TutorialStepContent[]> = {
  playback: playbackLessonContent,
  "draw-a-character": drawACharacterLessonContent,
  "record-a-rule": recordARuleLessonContent,
  "event-blocks": eventBlocksLessonContent,
  "falling-boulder": fallingBoulderLessonContent,
};
