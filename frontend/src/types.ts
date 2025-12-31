import { RECORDING_PHASE, TOOLS, WORLDS } from "./editor/constants/constants";
import { Frame } from "./editor/utils/frame-accumulator";

export type ImageData = string;

export type ActorSelection = { worldId: string; stageId: string; actorIds: string[] };

export type Position = {
  x: number;
  y: number;
};

export type PositionRelativeToWorld = {
  x: number;
  y: number;
};

export type PositionRelativeToRuleExtent = {
  x: number;
  y: number;
};

export type PositionRelativeToMainActor = {
  x: number;
  y: number;
};

export type FrameInput = { keys: { [key: string]: true }; clicks: { [actorId: string]: true } };

export type MathOperation = "add" | "set" | "subtract";

export type VariableComparator =
  | "="
  | "!="
  | ">="
  | "<="
  | ">"
  | "<"
  | "contains"
  | "starts-with"
  | "ends-with";

export type RuleAction = (
  | {
      type: "appearance";
      actorId: string;
      value: RuleValue;
    }
  | {
      type: "variable";
      actorId: string;
      variable: string; // ID
      operation: MathOperation;
      value: RuleValue;
    }
  | {
      type: "global";
      global: string; // ID
      operation: MathOperation;
      value: RuleValue;
    }
  | {
      type: "delete";
      actorId: string;
    }
  | {
      type: "create";
      actor: Actor;
      actorId: string;
      offset: PositionRelativeToMainActor;
    }
  | {
      type: "move";
      actorId: string;
      delta?: { x: number; y: number };
      offset?: PositionRelativeToMainActor;
    }
  | {
      type: "transform";
      actorId: string;
      operation: MathOperation;
      value: RuleValue;
    }
) & { animationStyle?: RuleActionAnimationStyle };

export type RuleActionAnimationStyle = "linear" | "none" | "skip";

export type ActorTransform = "0" | "90" | "180" | "270" | "flip-x" | "flip-y" | "d1" | "d2";

export type RuleExtent = {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  ignored: Record<string, boolean>; // [`${x},${y}`];
};

export type RuleTreeEventItem = {
  type: "group-event";
  rules: RuleTreeItem[];
  event: "idle" | "key" | "click";
  code?: number; // used for key event
  id: string;
};

export type RuleTreeFlowItemCheck = {
  id: string;
  mainActorId: string;
  conditions: RuleCondition[];
  actors: { [actorIdInRule: string]: Actor };
  extent: RuleExtent;
};

export type RuleTreeFlowItemBase = {
  type: "group-flow";
  name: string;
  rules: RuleTreeItem[];
  id: string;

  check?: RuleTreeFlowItemCheck;
};

export type RuleTreeFlowItemFirst = RuleTreeFlowItemBase & {
  behavior: "first";
};

export type RuleTreeFlowItemAll = RuleTreeFlowItemBase & {
  behavior: "all";
};

export type RuleTreeFlowItemRandom = RuleTreeFlowItemBase & {
  behavior: "random";
};

export type RuleTreeFlowLoopItem = RuleTreeFlowItemBase & {
  behavior: "loop";
  loopCount: { constant: number } | { variableId: string };
};

export type RuleTreeFlowItem =
  | RuleTreeFlowItemFirst
  | RuleTreeFlowItemRandom
  | RuleTreeFlowItemAll
  | RuleTreeFlowLoopItem;

export type RuleTreeItem = RuleTreeEventItem | RuleTreeFlowItem | Rule;

export type RuleCondition = {
  key: string;
  enabled: boolean;
  left: RuleValue;
  comparator: VariableComparator;
  right: RuleValue;
};

export type RuleValue =
  | { constant: string }
  | { actorId: string; variableId: string | "appearance" | "transform" | "x" | "y" }
  | { globalId: string };

/**
 * Within a rule, the main actor is always at "0,0" and the extent
 * expresses how many squares are within the rule to each side.
 * [-1, -1, 1, 1] would be one square in each direction.
 *
 * Other actors positions are also relative to the main actor.
 *
 * Note: Actions also express positions relative to the main actor,
 * but because the main actor can move they are all relative to the
 * position of the main actor /at the start/ of rule evaluation.
 */
export type Rule = {
  type: "rule";
  mainActorId: string;
  conditions: RuleCondition[];
  actors: { [actorIdInRule: string]: Actor };
  actions: RuleAction[];
  extent: RuleExtent;
  id: string;
  name: string;
};

export type Actor = {
  id: string;
  characterId: string;
  variableValues: Record<string, string>;
  appearance: string;
  position: PositionRelativeToWorld;
  transform?: ActorTransform;

  // Available in the context of the world operator
  frameCount?: number; // used to sync subdivided animation frames to CSS durations
  animationStyle?: RuleActionAnimationStyle;
};

export type Stage = {
  id: string;
  order: number;
  name: string;
  actors: { [actorId: string]: Actor };
  background: ImageData | string;
  width: number;
  height: number;
  wrapX: boolean;
  wrapY: boolean;
  scale?: number | "fit";
  startThumbnail: ImageData;
  tutorial_name?: string;
  tutorial_step?: number;
  world?: string;
  startActors: { [actorId: string]: Actor };
};

export type AppearanceInfo = {
  anchor: { x: number; y: number };
  filled: { [xy: string]: boolean };
  width: number;
  height: number;
  variableOverlay?: {
    showVariables: boolean;
    visibleVariables: { [variableId: string]: boolean };
  };
};
export type Characters = { [id: string]: Character };

export type Character = {
  id: string;
  name: string;
  rules: RuleTreeItem[];
  spritesheet: {
    appearances: { [appearanceId: string]: ImageData[] };
    appearanceNames: { [appearanceId: string]: string };
    appearanceInfo?: {
      [appearanceId: string]: AppearanceInfo;
    };
  };
  variables: Record<
    string,
    {
      id: string;
      name: string;
      defaultValue: string;
    }
  >;
};

/** Detailed evaluation result for a single condition */
export type EvaluatedCondition = {
  conditionKey: string;
  passed: boolean;
  leftValue?: string | null;
  rightValue?: string | null;
};

/** Detailed evaluation result for a single extent square */
export type EvaluatedSquare = {
  x: number;
  y: number;
  passed: boolean;
  reason?:
    | "offscreen" // Position is offscreen on non-wrapping stage
    | "actor-count-mismatch" // Different number of actors than expected
    | "actor-match-failed" // Actor exists but doesn't match rule actor
    | "ok"; // Square passed
  expectedActorCount?: number;
  actualActorCount?: number;
};

/** Detailed evaluation result for a rule */
export type EvaluatedRuleDetails = {
  passed: boolean;

  // Which stage of checking caused failure (for quick diagnosis)
  failedAt?:
    | "extent-square" // A square in the extent didn't match
    | "missing-required-actor" // A required actor wasn't found
    | "action-offset-invalid" // An action would go offscreen
    | "condition-failed"; // A condition check failed

  // Detailed breakdown
  conditions: EvaluatedCondition[];
  squares: EvaluatedSquare[];

  // Which actors were successfully matched (ruleActorId -> stageActorId)
  matchedActors: { [ruleActorId: string]: string };
};

/** Granular evaluation data per actor per rule */
export type EvaluatedRuleDetailsMap = {
  [actorId: string]: {
    [ruleId: string]: EvaluatedRuleDetails;
  };
};

export type Global =
  | {
      id: string;
      name: string;
      value: string;
    }
  | {
      id: "selectedStageId";
      name: "Current Stage";
      value: string;
      type: "stage";
    }
  | {
      id: "click";
      name: "Clicked Actor";
      value: string;
      type: "actor";
    }
  | {
      id: "keypress";
      name: "Key Pressed";
      value: string;
      type: "key";
    };

export type Globals = {
  click: Global;
  keypress: Global;
  selectedStageId: Global;
  [globalId: string]: Global;
};

export type HistoryItem = {
  input: FrameInput;
  globals: Globals;
  evaluatedRuleDetails: EvaluatedRuleDetailsMap;
  stages: { [stageId: string]: Pick<Stage, "actors"> };
};

export type WorldMinimal = {
  id: WORLDS;
  stages: { [stageId: string]: Stage };
  globals: Globals;
  input: FrameInput;
  evaluatedRuleDetails: EvaluatedRuleDetailsMap;
  evaluatedTickFrames?: Frame[];
};

export type World = WorldMinimal & {
  history: HistoryItem[];
  metadata: {
    name: string;
    id: number;
    published: boolean;
    description: string | null;
  };
};

export type UIState = {
  selectedToolId: TOOLS;
  selectedCharacterId: string | null;
  selectedActors: ActorSelection | null;
  stampToolItem:
    | ActorSelection
    | { characterId: string }
    | { characterId: string; appearanceId: string }
    | { ruleId: string }
    | null;
  tutorial: {
    stepSet?: keyof typeof import("./editor/constants/tutorial").tutorialSteps;
    stepIndex: number;
  };
  playback: {
    speed: number;
    running: boolean;
  };
  keypicker: {
    open: boolean | null;
    replaceConditionKey: string | null;
    initialKey: string | null;
  };
  paint: {
    characterId: string | null;
    appearanceId: string | null;
  };
  modal: {
    openId: string | null;
  };
};

export type EditorState = {
  version: 1;
  characters: Characters;
  world: World;
  undoStack: [];
  redoStack: [];
  ui: UIState;
  recording: RecordingState;
};

export type Game = {
  name: string;
  id: number;
  userId: number;
  playCount: number;
  forkCount: number;
  forkParent: Game | null;
  user: {
    id: number;
    username: string;
  };
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  description: string | null;
  data: Partial<EditorState> & Omit<EditorState, "ui" | "recording">;
};

export type RecordingState = {
  phase: RECORDING_PHASE;
  characterId: string | null;
  actorId: string | null;
  ruleId: string | null;
  actions: RuleAction[] | null; // null for flow checks
  conditions: RuleCondition[];
  extent: RuleExtent;
  beforeWorld: WorldMinimal & { id: WORLDS.BEFORE };
  afterWorld: WorldMinimal & { id: WORLDS.AFTER };
};
