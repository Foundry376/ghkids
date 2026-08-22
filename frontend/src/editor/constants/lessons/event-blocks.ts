import { stopPlayback } from "../../actions/ui-actions";
import { TutorialStepContent } from "../tutorial-content";
import { heroIn, LESSON_CHARACTER_IDS } from "./characters";

/**
 * Lesson 4 - Event Blocks.
 *
 * Same world as lesson 3, except the hero already knows how to climb: the world
 * ships with that rule in his idle container, which is where the recorder would
 * have left it. The kid moves it into a green key event block so he only climbs
 * when a key is pressed.
 */
const BOULDER_COLUMN = 10;

export const eventBlocksLessonContent: TutorialStepContent[] = [
  {
    pose: "standing-pointing",
    text: `Double-click on our hero and let's look at the rules we've taught him.`,
    annotation: {
      selectors: [`[data-stage-character-id=${LESSON_CHARACTER_IDS.hero}]`],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => state.ui.selectedCharacterId === LESSON_CHARACTER_IDS.hero,
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
        const hero = heroIn(stage);
        return hero && hero.position.x < BOULDER_COLUMN;
      },
    },
  },
  {
    pose: "standing-pointing",
    text: `Click the 'Play' button to start the game. Try climbing over the rock now.`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    waitsFor: {
      stateMatching: (_state, stage) => {
        const hero = heroIn(stage);
        return hero && hero.position.x > BOULDER_COLUMN;
      },
    },
  },
  {
    pose: "excited",
    text: `Nice - it worked! This game is getting fun! Want to make it harder? I was thinking that boulder on the ledge could fall when the hero walks by.`,
  },
];
