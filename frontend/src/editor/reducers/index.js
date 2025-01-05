import * as Types from "../constants/action-types";
import { undoRedoReducerFactory } from "../utils/undo-redo";
import charactersReducer from "./characters-reducer";
import recordingReducer from "./recording-reducer";
import uiReducer from "./ui-reducer";
import worldReducer from "./world-reducer";

const reducerMap = {
  ui: uiReducer,
  world: worldReducer,
  characters: charactersReducer,
  recording: recordingReducer,
};

const undoRedoReducer = undoRedoReducerFactory({
  trackedKeys: ["recording", "world", "characters", "stages"],
  ignoredActions: [
    Types.ADVANCE_GAME_STATE,
    Types.STEP_BACK_GAME_STATE,
    Types.INPUT_FOR_GAME_STATE,
  ],
});

function applyReducerMap(map, state, action) {
  const nextState = Object.assign({}, state);

  for (const key of Object.keys(map)) {
    if (map[key] instanceof Function) {
      nextState[key] = map[key](state[key], action, state);
    } else {
      nextState[key] = applyReducerMap(map[key], state[key], action);
    }
  }

  return nextState;
}

export default function (state, action) {
  // apply reducers that handle individual state keys
  let nextState = applyReducerMap(reducerMap, state, action);

  // apply undo/redo actions
  nextState = undoRedoReducer(nextState, action);

  return nextState;
}
