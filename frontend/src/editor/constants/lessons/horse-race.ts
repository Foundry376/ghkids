import { Dispatch } from "redux";
import { changeActors } from "../../actions/stage-actions";
import { stopPlayback } from "../../actions/ui-actions";
import { EditorState, RecordingState, Rule, RuleTreeFlowItem, RuleTreeItem } from "../../../types";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { TOOLS } from "../constants";
import { TutorialStepContent } from "../tutorial-content";
import { horsePaths, horsesIn, LESSON_CHARACTER_IDS } from "./characters";

/**
 * Lesson 7 - Horse Race.
 *
 * Three horses - one character with a Brown, a Black and a White appearance -
 * wait at the starting line, each in its own lane, with a finish line ten
 * squares ahead. They share one rule, "Trot Forward", so every race is a tie.
 *
 * To make the race worth watching the kid adds a rule box, sets it to
 * "Randomize & Do First", and fills it with three rules: the trot rule, one
 * they record where the horse stands still, and one where it gallops two
 * squares. Each turn the box shuffles those and runs the first that matches.
 *
 * Recording on a horse adds "appearance is <this horse's color>" to the rule,
 * which would leave the other two horses out, so the kid removes that check
 * each time. (Lesson 6 is where they first saw it.)
 *
 * The finish line fills the column past the last square a horse can reach, so
 * every one of those rules stops matching there - nobody runs off the stage.
 */
const HORSE_STARTS = [
  { x: 2, y: 5 },
  { x: 2, y: 4 },
  { x: 2, y: 3 },
];
/** The square in front of the finish line: as far as a horse can go. */
const LAST_COLUMN = 12;
const GALLOP_SQUARES = 2;
/** The id build-lesson-worlds gives the rule the horses start with. */
const TROT_RULE_ID = "rule-trot-forward";
const HORSE_ON_STAGE = `.stages-horizontal-flex [data-stage-character-id=${LESSON_CHARACTER_IDS.horse}]`;
const RULE_BOX_LIST = ".rule-container.group-flow .rules-list";
/** A rule the kid just recorded, which lands at the top of the horse's list. */
const NEWEST_RULE = ".scroll-container-contents > .rules-list > li.rule:first-child";

const backToTheStartingLine = (dispatch: Dispatch) => {
  dispatch(stopPlayback());
  horsePaths.forEach((path, i) => dispatch(changeActors(path, { position: HORSE_STARTS[i] })));
};

const everyHorseFinished = (stage: Parameters<typeof horsesIn>[0]) => {
  const horses = horsesIn(stage);
  return horses.length > 0 && horses.every((h) => h.position.x === LAST_COLUMN);
};

/** The rule box set to randomize, if the kid has made one. */
function randomBox(state: EditorState): RuleTreeFlowItem | undefined {
  let found: RuleTreeFlowItem | undefined;
  const visit = (items: RuleTreeItem[]) => {
    for (const item of items) {
      if (item.type === "group-flow" && item.behavior === "random" && !found) {
        found = item;
      }
      if ("rules" in item) {
        visit(item.rules);
      }
    }
  };
  visit(state.characters[LESSON_CHARACTER_IDS.horse]?.rules ?? []);
  return found;
}

const hasAnyRuleBox = (state: EditorState) =>
  (state.characters[LESSON_CHARACTER_IDS.horse]?.rules ?? []).some(
    (r) => r.type === "group-flow",
  );

const randomBoxHolds = (state: EditorState, matches: (rule: Rule) => boolean) =>
  !!randomBox(state)?.rules.some((r) => r.type === "rule" && matches(r));

const movesForward = (rule: Rule, squares: number) =>
  rule.actions.some(
    (a) => a.type === "move" && (a.offset?.x === squares || a.delta?.x === squares),
  );

const recordingAHorse = (recording: RecordingState) =>
  recording.characterId === LESSON_CHARACTER_IDS.horse && !!recording.actorId;

const hasAppearanceCheck = (recording: RecordingState) =>
  recording.conditions.some((c) => c.key === "main-actor-appearance");

/** The horse being recorded, in the recording's before and after pictures. */
function recordedHorse(recording: RecordingState) {
  const before = getCurrentStageForWorld(recording.beforeWorld);
  const after = getCurrentStageForWorld(recording.afterWorld);
  const id = recording.actorId;
  return {
    before: before && id ? before.actors[id] : undefined,
    after: after && id ? after.actors[id] : undefined,
  };
}

export const horseRaceLessonContent: TutorialStepContent[] = [
  {
    pose: ["folded-talking", "standing-pointing"],
    text: `It's race day! Our three horses are lined up at the starting line, and the checkered line is the finish. Click 'Play' and let's see who wins!`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    onEnter: backToTheStartingLine,
    waitsFor: {
      stateMatching: (_state, stage) => everyHorseFinished(stage),
    },
  },
  {
    pose: ["standing-confused", "folded-talking"],
    text: `It's a tie! All three horses ran at exactly the same speed. That's not a very fun race to watch - we knew what would happen before it even started.`,
  },
  {
    pose: ["folded-talking", "standing-talking"],
    text: `A race is a lot more exciting when you can't guess who's going to win. To do that, we need something random - like rolling dice to decide what each horse does.`,
  },
  {
    pose: "standing-pointing",
    text: `Double-click on one of the horses to see its rules.`,
    annotation: { selectors: [HORSE_ON_STAGE], style: "outline" },
    onEnter: backToTheStartingLine,
    waitsFor: {
      stateMatching: (state) => state.ui.selectedCharacterId === LESSON_CHARACTER_IDS.horse,
    },
  },
  {
    pose: ["standing-pointing", "folded-talking"],
    text: `The horses only have one rule: move forward one square. Every horse follows it every turn, so they always run at the same speed.`,
    annotation: { selectors: [`[data-rule-id="${TROT_RULE_ID}"]`], style: "outline" },
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
      stateMatching: (state) => hasAnyRuleBox(state),
    },
  },
  {
    pose: ["excited", "standing-pointing"],
    text: `There's our new rule box! This menu tells it what to do with the rules inside. Choose 'Randomize & Do First'.`,
    annotation: {
      selectors: [".rule-container.group-flow [data-tutorial-id=rule-box-behavior]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => !!randomBox(state),
    },
  },
  {
    pose: ["sitting-talking", "folded-talking"],
    text: `Now, every turn, the box will shuffle its rules like a deck of cards, and the horse will do the first one that works. That way the horse picks a rule at random!`,
  },
  {
    pose: "standing-pointing",
    text: `Drag and drop the move forward rule into the empty space inside our new rule box.`,
    annotation: {
      style: "arrow",
      selectors: [`[data-rule-id="${TROT_RULE_ID}"]`, RULE_BOX_LIST],
    },
    waitsFor: {
      stateMatching: (state) => randomBoxHolds(state, (r) => r.id === TROT_RULE_ID),
    },
  },
  {
    pose: ["standing-talking", "standing-pointing"],
    text: `A random box needs more than one rule to choose from. First, let's make a rule where the horse takes a break and stands still. Click the recording tool, then click one of the horses.`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) =>
        state.ui.selectedToolId === TOOLS.RECORD && recordingAHorse(state.recording),
    },
  },
  {
    pose: ["sitting-talking", "standing-pointing"],
    text: `See the check down here? Codako added it for us: the horse's appearance has to match this one, so only this color horse would use the rule. We want every horse to use it, so click the X to remove the check.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-conditions] .condition-remove"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: ({ recording }) => !hasAppearanceCheck(recording),
    },
  },
  {
    pose: "standing-pointing",
    text: `In this rule the horse doesn't do anything, so we don't need to change the picture on the right. Just click 'Done'.`,
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
    text: `Drag your new rule into the rule box too.`,
    annotation: { style: "arrow", selectors: [NEWEST_RULE, RULE_BOX_LIST] },
    waitsFor: {
      stateMatching: (state) => randomBoxHolds(state, (r) => r.actions.length === 0),
    },
  },
  {
    pose: ["excited", "standing-pointing"],
    text: `One more! This time let's make a rule where the horse gallops ahead two squares. Click the recording tool again, then click a horse.`,
    annotation: {
      selectors: ["[data-tutorial-id=toolbar-tool-record]"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: (state) => recordingAHorse(state.recording),
    },
  },
  {
    pose: "standing-pointing",
    text: `Click the X to remove the appearance check again, so every horse can gallop.`,
    annotation: {
      selectors: ["[data-tutorial-id=record-conditions] .condition-remove"],
      style: "outline",
    },
    waitsFor: {
      stateMatching: ({ recording }) => !hasAppearanceCheck(recording),
    },
  },
  {
    pose: "standing-pointing",
    text: `The horse needs room to gallop. Drag the right handle over by two squares.`,
    annotation: { selectors: ["[data-stage-handle=right]"], style: "outline" },
    waitsFor: {
      stateMatching: (state) =>
        state.recording.extent.xmax - state.recording.extent.xmin >= GALLOP_SQUARES,
    },
  },
  {
    pose: "standing-pointing",
    text: `In the picture on the right, drag the horse forward two squares.`,
    annotation: { selectors: ["[data-stage-wrap-id=after]"], style: "outline" },
    waitsFor: {
      stateMatching: ({ recording }) => {
        const { before, after } = recordedHorse(recording);
        return (
          !!before &&
          !!after &&
          after.position.x === before.position.x + GALLOP_SQUARES &&
          after.position.y === before.position.y
        );
      },
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
    pose: "standing-pointing",
    text: `Drag the gallop rule into the rule box with the others.`,
    annotation: { style: "arrow", selectors: [NEWEST_RULE, RULE_BOX_LIST] },
    waitsFor: {
      stateMatching: (state) => randomBoxHolds(state, (r) => movesForward(r, GALLOP_SQUARES)),
    },
  },
  {
    pose: ["sitting-talking", "standing-pointing"],
    text: `Now every turn, each horse picks one of its three rules at random: stand still, move one square, or gallop two. Press 'Play' and let's see who wins!`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    onEnter: backToTheStartingLine,
    waitsFor: {
      stateMatching: (_state, stage) => everyHorseFinished(stage),
    },
  },
  {
    pose: "excited",
    text: `What a race! Let's run it again. Press 'Play' - since the horses pick their rules at random, a different horse might win this time.`,
    annotation: { selectors: ["[data-tutorial-id=play]"], style: "outline" },
    onEnter: backToTheStartingLine,
    waitsFor: {
      stateMatching: (_state, stage) => everyHorseFinished(stage),
    },
  },
  {
    pose: ["excited", "sitting-talking"],
    text: `Now nobody knows who's going to win until the race is over! A random rule box is great any time you want a game to surprise you - like an enemy that wanders around, or a coin that could land anywhere.`,
  },
];
