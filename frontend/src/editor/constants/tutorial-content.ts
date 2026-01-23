/**
 * Tutorial step content - the source of truth for tutorial text and behavior.
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
import { changeActors } from "../actions/stage-actions";
import { stopPlayback } from "../actions/ui-actions";
import { TutorialAnnotationProps } from "../components/tutorial/annotation";
import { PoseKey } from "../components/tutorial/girl";
import { getCurrentStageForWorld } from "../utils/selectors";
import { RECORDING_PHASE, TOOLS } from "./constants";

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

export const baseTutorialContent: TutorialStepContent[] = [
  {
    pose: "sitting-talking",
    text: `Hi there! I'm Ravi, and this is a game I've been working on. Want to help me finish it? Click "Start Lesson" over here!`,
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
    text: `Let's see how your bridge does! Click 'Play' again and try using the arrow keys to walk over the lava. If you can't get to the other side, try moving the bridge pieces around.`,
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
    text: `Great job - you made it over! Next, we need to teach our hero to climb so he can get over that boulder. Click here to start the next lesson.`,
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
    text: `In Codako, rules define how the game works. Click the recording tool in the toolbar. We'll create a new rule that teaches our hero how to climb a boulder.`,
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
    text: `Okay, now click on our hero - we want to show him how to climb, so this rule is for him.`,
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
    text: `Great! See how that created an instruction? Now he knows what he should do!`,
    annotation: {
      selectors: [".recording-specifics .panel-actions li"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `Click 'Save Recording' and let's try out your new rule.`,
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
    text: `Wow that was great! We taught the hero how to climb up over the rock. Now we can use the arrow keys to get him to the exit.`,
  },
  {
    pose: "standing-confused",
    text: `Hmm... Since we're making a game we should probably make our hero wait to climb until you press the space bar. Want to help me change that?`,
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
    text: `Double-click on our hero and let's look at the rules we've taught him.`,
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
    text: `Each time our hero takes a step, he starts with the first rule and moves down the list. He looks at each one to see if his surroundings match the picture in that rule. If it does, he does what the rule tells him and stops.`,
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
    text: `Sometimes, we only want our hero to follow a rule if we press a key on the keyboard. That's what the green Event blocks are for! They tell our hero he should only look inside when we're pressing a key.`,
  },
  {
    pose: ["standing-pointing", "folded-talking"],
    text: `See? Here's the rule that tells our hero to walk right. You can tell the rule is showing him how to walk right, because the picture shows him starting in the left square, and ending in the right square.`,
    annotation: {
      selectors: [".rule-container.group-event:first-child"],
      style: "outline",
    },
  },
  {
    pose: ["standing-pointing", "folded-talking"],
    text: `That rule is inside a green block that says 'when the right arrow key is pressed.' Our hero will only think about walking right when we're pressing that key!`,
    annotation: {
      selectors: [".rule-container:first-child .header .name"],
      style: "outline",
    },
  },
  {
    pose: ["standing-confused", "folded-talking"],
    text: `We taught our hero to climb, but we didn't tell him to wait for us to press a key. Our climbing rule is down at the bottom with the other rules our hero looks at when he's not busy.`,
  },
  {
    pose: "standing-pointing",
    text: `We'll need a new green Event block. Click 'Add' up here.`,
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
    text: `Choose 'When a Key is Pressed' from the menu.`,
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
    text: `Okay. What key should make him jump? Maybe the space bar? Press a key you want to use and then click the "Done" button.`,
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
    text: `Great! There's our new green block. Let's put our climbing rule in there so the hero will only climb when we press that key.`,
    annotation: {
      selectors: [".rule-container.group-event:first-child"],
      style: "outline",
    },
  },
  {
    pose: "standing-pointing",
    text: `Drag and drop the climbing rule into the empty space inside our new green block.`,
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
    text: `Drag and drop the climbing rule into the empty space inside our new green block.`,
    skipAudio: true, // Wait/continuation step - reuses text from previous step
    waitsFor: {
      elementMatching: ".rule-container.group-event:first-child li",
    },
  },
  {
    pose: ["excited", "sitting-talking"],
    text: `We've just told our hero that he should only climb when you press that key. Move the hero back to the left side of the stage and let's try this out!`,
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
    text: `Click the 'Play' button to start the game. Try climbing over the rock now.`,
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
    text: `Nice - it worked! This game is getting fun! Want to make it harder? I was thinking that boulder on the ledge could fall when the hero walks by.`,
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
    text: `This time, we need to teach the boulder a new rule. When the hero gets close, it should slip off the ledge and start to fall! Let's say the hero should be...`,
    onEnter: (dispatch) => {
      dispatch(stopPlayback());
    },
  },
  {
    pose: "folded-talking",
    text: `here when the boulder starts to fall. Remember how we created our first rule?`,
    onEnter: (dispatch) => {
      dispatch(changeActors(baseTutorialCharacterPath, { position: { x: 12, y: 9 } }));
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
          state.recording.phase === RECORDING_PHASE.RECORD &&
          state.recording.characterId === "oou4u6jemi"
        );
      },
    },
  },
  {
    pose: ["standing-confused", "sitting-talking"],
    text: `Perfect. See how the stage has grayed out? We want the boulder to slip when the hero is down below, so we need to include him in the rule. Can you expand the recording so our hero is inside the box?`,
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
        const boulder = Object.values(after.actors).find((a) => a.characterId === "oou4u6jemi");
        return boulder && boulder.position.x < 14;
      },
    },
  },
  {
    pose: "standing-pointing",
    text: `Great! Now the boulder will slip off the ledge when our hero walks over and the picture on the left matches!`,
  },
  {
    pose: "standing-pointing",
    text: `Click 'Save Recording' and let's try out your new rule.`,
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
          state.recording.phase === RECORDING_PHASE.RECORD &&
          state.recording.characterId === "oou4u6jemi"
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
        const boulder = Object.values(after.actors).find((a) => a.characterId === "oou4u6jemi");
        return boulder && boulder.position.y > 5;
      },
    },
  },
  {
    pose: "folded-talking",
    text: `Nice! The boulder will fall down until it reaches the ground. Once it's on the ground the picture on the left won't match - there won't be any empty space for it to fall into!`,
  },
  {
    pose: "standing-pointing",
    text: `Click 'Save Recording' and let's try out your new rule.`,
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
    text: `That was pretty cool, huh? I don't really know what we should do next. Why don't you make your own rules! You could make our hero jump over the boulder or teach him to dig into the dirt, or create a whole new game piece!`,
  },
  {
    pose: "sitting-looking",
    text: `That's it for the tutorial. If you want to learn more, you can find videos and other resources in the main menu!`,
    annotation: {
      selectors: ["[data-tutorial-id=main-menu]"],
      style: "outline",
    },
    waitsFor: {
      button: "End Tutorial",
    },
  },
];

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

export const tutorialContent = {
  base: baseTutorialContent,
  fork: forkTutorialContent,
};
