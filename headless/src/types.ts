export type ImageData = string;

export type PositionRelativeToWorld = {
  x: number;
  y: number;
};

export type PositionRelativeToRuleExtent = {
  x: number;
  y: number;
};

export type RuleAction =
  | {
      actorId: string;
      type: "appearance";
      to: string;
    }
  | {
      actorId: string;
      type: "move";
      delta: { x: number; y: number };
    }
  | {
      actorId: string;
      type: "transform";
      to: ActorTransform;
    };

export type ActorTransform = "none" | "flip-x" | "flip-xy";

export type RuleExtent = {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  ignored: {};
};

export type RuleTreeEventItem = {
  type: "group-event";
  rules: RuleTreeItem[];
  event: "idle" | "key" | "click";
  code: number; // used for key event
  id: string;
};

export type RuleTreeFlowItem = {
  type: "group-flow";
  behavior: "first" | "all" | "random";
  name: string;
  rules: RuleTreeItem[];
  id: string;
};

export type RuleTreeFlowLoopItem = {
  type: "group-flow";
  behavior: "loop";
  name: string;
  rules: RuleTreeItem[];
  id: string;
  loopCount: { constant: number } | { variableId: string };
};

export type RuleTreeItem =
  | RuleTreeEventItem
  | RuleTreeFlowItem
  | RuleTreeFlowLoopItem
  | Rule;

export type Rule = {
  type: "rule";
  mainActorId: string;
  conditions: {
    [actorIdInRule: string]: {
      appearance?: {
        enabled: boolean;
      };
      transform?: {
        enabled: true;
      };
    };
  };
  actors: {
    [actorIdInRule: string]: {
      id: string;
      characterId: string;
      variableValues: {};
      appearance: string;
      position: PositionRelativeToRuleExtent;
      transform: ActorTransform;
    };
  };
  actions: RuleAction[];
  extent: RuleExtent;
  id: string;
  name: string;
};

export type Actor = {
  id: string;
  characterId: string;
  variableValues: {};
  appearance: string;
  position: PositionRelativeToWorld;
};

export type Stage = {
  id: string;
  actors: { [actorId: string]: Actor };
  background: ImageData;
  height: number;
  startThumbnail: ImageData;
  tutorial_name: string;
  tutorial_step: number;
  width: number;
  world: "5233a60cfd685f755e000001";
  wrapX: boolean;
  wrapY: boolean;
  startActors: { [actorId: string]: Actor };
  name: string;
};

export type Character = {
  id: string;
  name: string;
  rules: RuleTreeItem[];
  spritesheet: {
    width: number;
    appearances: { [appearanceId: string]: ImageData[] };
    appearanceNames: { [appearanceId: string]: string };
  };
  variables: {};
};

export type EvaluatedRuleIds = {
  [actorId: string]: {
    [ruleTreeItemId: string]: boolean;
  };
};

export type World = {
  id: string;
  stages: {
    [stageId: string]: Stage;
  };
  globals: {
    selectedStageId: {
      id: "selectedStageId";
      name: "Current Stage";
      value: "root";
      type: "stage";
    };
  };
  input: {
    keys: {};
    clicks: {};
  };
  history: any;
  evaluatedRuleIds: EvaluatedRuleIds;
  metadata: {
    name: string;
    id: number;
  };
};

export type EditorState = {
  characters: {
    [characterId: string]: Character;
  };
  world: World;
  undoStack: [];
  redoStack: [];
  ui: {
    selectedToolId: "pointer";
    selectedCharacterId: "aamlcui8uxr";
    selectedActors: {
      worldId: "root";
      stageId: "root";
      actorIds: ["1483668698770"];
    };
    tutorial: {
      stepIndex: 0;
      stepSet: "base";
    };
    playback: {
      speed: 250;
      running: false;
    };
    keypicker: {
      initialKeyCode: null;
    };
    paint: {
      characterId: null;
    };
    modal: {
      openId: null;
    };
  };
  recording: {
    phase: null;
    characterId: null;
    actorId: null;
    ruleId: null;
    conditions: [];
    extent: {
      xmin: 0;
      xmax: 0;
      ymin: 0;
      ymax: 0;
      ignored: {};
    };
    beforeWorld: {
      id: "before";
      stages: {};
      globals: {};
    };
    afterWorld: {
      id: "after";
      stages: {};
      globals: {};
    };
  };
};

export type Game = {
  name: string;
  id: number;
  userId: number;
  playCount: number;
  forkCount: number;
  forkParent: null;
  user: {
    id: number;
    username: string;
  };
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
  data: EditorState;
};
