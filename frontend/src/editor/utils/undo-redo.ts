// @ts-ignore - no type definitions available
import { Delta, DiffPatcher } from "jsondiffpatch/src/diffpatcher";
import { EditorState } from "../../types";
import { deepClone } from "./utils";

const PERFORM_UNDO = "PERFORM_UNDO";
const PERFORM_REDO = "PERFORM_REDO";
const PUSH_STACK = "PUSH_STACK";

type UndoAction = { type: typeof PERFORM_UNDO };
type RedoAction = { type: typeof PERFORM_REDO };
type PushStackAction = {
  type: typeof PUSH_STACK;
  triggeringActionType: string;
  diff: Delta;
};

export type UndoRedoAction = UndoAction | RedoAction | PushStackAction;

const patcher = new DiffPatcher({
  textDiff: {
    minLength: Number.MAX_SAFE_INTEGER,
  },
});

export function undo(): UndoAction {
  return {
    type: PERFORM_UNDO,
  };
}

export function redo(): RedoAction {
  return {
    type: PERFORM_REDO,
  };
}

type StateWithStacks = EditorState & {
  undoStack: Delta[];
  redoStack: Delta[];
};

function shift(
  state: StateWithStacks,
  sourceStackName: "undoStack" | "redoStack",
  targetStackName: "undoStack" | "redoStack"
): StateWithStacks {
  let nextState = deepClone(state) as StateWithStacks;
  const diff = nextState[sourceStackName].pop();
  if (diff) {
    nextState = patcher.patch(nextState, diff) as StateWithStacks;
    nextState[targetStackName].push(patcher.reverse(diff)!);
  }
  return nextState;
}

interface DiffByApplyingOptionsConfig {
  trackedKeys?: string[];
}

function diffByApplyingOptions(
  fullDiff: Delta = {},
  { trackedKeys }: DiffByApplyingOptionsConfig = {}
): Delta | null {
  let diff: Delta = fullDiff || {};
  if (trackedKeys) {
    diff = {};
    Object.keys(fullDiff)
      .filter((key) => trackedKeys.includes(key))
      .forEach((key) => {
        diff[key] = fullDiff[key];
      });
  }
  return Object.keys(diff).length > 0 ? diff : null;
}

interface UndoRedoReducerConfig {
  trackedKeys?: string[];
  ignoredActions?: string[];
}

export const undoRedoReducerFactory = ({
  trackedKeys,
  ignoredActions = [],
}: UndoRedoReducerConfig = {}) => {
  return (state: StateWithStacks, action: UndoRedoAction | { type: string }): StateWithStacks => {
    if (action.type === PERFORM_UNDO) {
      return shift(state, "undoStack", "redoStack");
    }
    if (action.type === PERFORM_REDO) {
      return shift(state, "redoStack", "undoStack");
    }
    if (action.type === PUSH_STACK) {
      const pushAction = action as PushStackAction;
      if (ignoredActions.includes(pushAction.triggeringActionType)) {
        return state;
      }
      const diff = diffByApplyingOptions(pushAction.diff, { trackedKeys });
      if (diff) {
        return Object.assign({}, state, {
          undoStack: ([] as Delta[]).concat(state.undoStack.slice(state.undoStack.length - 50), [
            diff,
          ]),
          redoStack: [],
        });
      }
    }

    return state;
  };
};

import { Middleware } from "redux";

export const undoRedoMiddleware: Middleware = (store) => (next) => (action) => {
  const typedAction = action as { type: string };
  if ([PERFORM_UNDO, PERFORM_REDO, PUSH_STACK].includes(typedAction.type)) {
    return next(action);
  }

  const before = store.getState();
  const result = next(action);
  const after = store.getState();

  const t = Date.now();
  const diff = patcher.diff(after, before);
  if (Date.now() - t > 50) {
    console.warn("Spent more than 50ms creating the undo/redo diff.");
  }
  if (diff && Object.keys(diff).length > 0) {
    store.dispatch({
      type: "PUSH_STACK",
      triggeringActionType: typedAction.type,
      diff: diff,
    });
  }
  return result;
};
