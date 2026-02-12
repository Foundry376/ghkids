import { EditorState, World } from "../../types";
import { RECORDING_PHASE, TOOLS, WORLDS } from "../constants/constants";
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
      name: "Current Stage",
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
  version: 1,
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
    tutorial: {
      stepIndex: 0,
    },
    playback: {
      speed: 500,
      running: false,
    },
    keypicker: {
      open: false,
      initialKey: null,
      replaceConditionKey: null,
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
    phase: RECORDING_PHASE.RECORD,
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
