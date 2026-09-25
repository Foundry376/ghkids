import { stopPlayback } from "../../actions/ui-actions";
import { EditorState, RuleTreeFlowItem, RuleTreeItem } from "../../../types";
import { TutorialStepContent } from "../tutorial-content";
import { heroIn, LESSON_CHARACTER_IDS } from "./characters";

/**
 * Lesson 4 - Rule Boxes.
 *
 * Same world as lesson 3, except the hero already knows how to climb: the world
 * ships with that rule in his idle container, which is where the recorder would
 * have left it. The kid adds a rule box, gives it a pretest - "when" the key
 * they pick is pressed - and moves the climbing rule inside, so the hero only
 * climbs when that key is down.
 *
 * The arrow-key rules the hero starts with are in green event blocks, which is
 * how older worlds do key rules; the lesson points at them to explain the idea,
 * then builds the new rule the rule-box way.
 */
const BOULDER_COLUMN = 10;
/** The id build-lesson-worlds gives the climbing rule this world ships with. */
const CLIMB_RULE_ID = "rule-climb-a-boulder";

/** Every rule box in the hero's rules, however deeply nested. */
function heroRuleBoxes(state: EditorState): RuleTreeFlowItem[] {
  const boxes: RuleTreeFlowItem[] = [];
  const visit = (items: RuleTreeItem[]) => {
    for (const item of items) {
      if (item.type === "group-flow") {
        boxes.push(item);
      }
      if ("rules" in item) {
        visit(item.rules);
      }
    }
  };
  visit(state.characters[LESSON_CHARACTER_IDS.hero]?.rules ?? []);
  return boxes;
}

/** A rule box whose pretest checks for a key press. */
const checksForKey = (box: RuleTreeFlowItem) =>
  !!box.check?.conditions.some(
    (c) => c.enabled && "globalId" in c.left && c.left.globalId === "keypress",
  );

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
    text: `Sometimes, we only want our hero to follow a rule if we press a key on the keyboard. We can do that by putting the rule in a rule box that checks for the key first!`,
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
    text: `We'll need a new rule box. Click the + button up here.`,
    annotation: {
      selectors: ["[data-tutorial-id=inspector-add-rule]"],
      style: "outline",
    },
    waitsFor: {
      elementMatching: ".show [data-tutorial-id=inspector-add-rule-box]",
    },
  },
  {
    pose: "standing-pointing",
    text: `Choose 'Add Rule Box' from the menu.`,
    annotation: {
      selectors: [".show [data-tutorial-id=inspector-add-rule-box]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => heroRuleBoxes(state).length > 0,
    },
  },
  {
    pose: ["excited", "standing-pointing"],
    text: `There's our new rule box! Right now it says 'Always', so our hero always looks inside. Change 'Always' to 'When' so we can tell it what to check for.`,
    annotation: {
      selectors: [".rule-container.group-flow [data-tutorial-id=rule-box-check]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => !!state.recording.ruleId?.endsWith("-check"),
    },
  },
  {
    pose: "standing-pointing",
    text: `This picture is the rule box's check. Click the keyboard button to choose a key it should look for.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-tool-keypress]"],
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
    pose: "standing-pointing",
    text: `Now the rule box will only look inside when that key is pressed. Click 'Done' to save the check.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-next-step]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) =>
        state.recording.characterId === null && heroRuleBoxes(state).some(checksForKey),
    },
  },
  {
    pose: "standing-pointing",
    text: `Drag and drop the climbing rule into the empty space inside our new rule box.`,
    annotation: {
      style: "arrow",
      selectors: [
        `[data-rule-id="${CLIMB_RULE_ID}"]`,
        ".rule-container.group-flow .rules-list",
      ],
    },
    waitsFor: {
      stateMatching: (state) =>
        heroRuleBoxes(state).some(
          (box) => checksForKey(box) && box.rules.some((r) => r.id === CLIMB_RULE_ID),
        ),
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
