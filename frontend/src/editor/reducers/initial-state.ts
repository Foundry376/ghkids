import { EditorState, World } from "../../types";
import { TOOLS, WORLDS } from "../constants/constants";
import { BUILTIN_STAGE_VARIABLES } from "../utils/builtin-stage-variables";
import stage from "./initial-state-stage";

const InitialWorld: World = {
  id: WORLDS.ROOT,
  stages: {
    [stage.id]: stage,
  },
  globals: {
    click: {
      id: "click",
      name: "Clicked Actor",
      value: "",
      type: "actor",
    },
    keypress: {
      id: "keypress",
      name: "Key Pressed",
      value: "",
      type: "key",
    },
    selectedStageId: {
      id: "selectedStageId",
      name: "Current Level",
      value: stage.id,
      type: "stage",
    },
    cameraFollow: {
      id: "cameraFollow",
      name: "Camera Follow",
      value: "",
      type: "actor",
    },
  },
  stageVariables: { ...BUILTIN_STAGE_VARIABLES },
  input: {
    keys: {},
    clicks: {},
  },
  metadata: {
    name: "",
    id: 0,
    published: false,
    description: null,
  },
  history: [],
  evaluatedRuleDetails: {},
};

const InitialState: EditorState = {
  // The editor authors in v2 coordinates (Y-up, 1-indexed), so a world started
  // from this state is already v2. Stamping it `1` made `applyDataMigrations`
  // run the v1 → v2 coordinate migration over data that never needed it the
  // next time the world was opened, flipping every actor upside down.
  version: 2,
  characters: {},
  characterZOrder: [],
  world: InitialWorld,
  undoStack: [],
  redoStack: [],
  ui: {
    selectedToolId: TOOLS.POINTER,
    stampToolItem: null,
    selectedCharacterId: null,
    selectedActors: null,
    selectedRuleId: null,
    tutorial: {
      stepIndex: 0,
    },
    playback: {
      speed: 500,
      running: false,
      runningDirection: "forward" as const,
    },
    keypicker: {
      open: false,
      initialKey: null,
      replaceConditionKey: null,
      purpose: "condition" as const,
      characterId: null,
    },
    paint: {
      characterId: null,
      appearanceId: null,
    },
    modal: {
      openId: null,
    },
  },
  recording: {
    characterId: null,
    actorId: null,
    ruleId: null,
    actions: [],
    conditions: [],
    extent: {
      xmin: 0,
      xmax: 0,
      ymin: 0,
      ymax: 0,
      ignored: {},
    },
    beforeWorld: {
      ...InitialWorld,
      id: WORLDS.BEFORE,
      stages: {},
    },
    afterWorld: {
      ...InitialWorld,
      id: WORLDS.AFTER,
      stages: {},
    },
  },
};

export default InitialState;
