// @ts-expect-error - no type definitions available
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

// Keys of a world that are produced by running the game rather than authored
// by the user. Every tick rewrites them, and ticks are deliberately kept off
// the undo stack, so a diff that described them could never be applied again
// once the game had run on - the actors and rules it points at are gone.
// They're also by far the largest part of the state (`history` holds up to 500
// deltas), which made every diff slow.
const DERIVED_WORLD_KEYS = ["history", "evaluatedRuleDetails", "evaluatedTickFrames", "input"];

function omitDerivedWorldState<T>(world: T): T {
  if (!world || typeof world !== "object") {
    return world;
  }
  const next = { ...world } as Record<string, unknown>;
  for (const key of DERIVED_WORLD_KEYS) {
    delete next[key];
  }
  return next as T;
}

/** Returns a shallow copy of the state with derived playback state removed. */
function omitDerivedState(state: StateWithStacks): StateWithStacks {
  if (!state || typeof state !== "object") {
    return state;
  }
  const next = { ...state, world: omitDerivedWorldState(state.world) };
  if (next.recording) {
    // The recording's before / after worlds are ticked when the user previews
    // a rule, so they carry the same derived state as the main world.
    next.recording = {
      ...next.recording,
      beforeWorld: omitDerivedWorldState(next.recording.beforeWorld),
      afterWorld: omitDerivedWorldState(next.recording.afterWorld),
    };
  }
  return next;
}

function shift(
  state: StateWithStacks,
  sourceStackName: "undoStack" | "redoStack",
  targetStackName: "undoStack" | "redoStack",
  prepareForShift?: (state: StateWithStacks) => StateWithStacks
): StateWithStacks {
  if (state[sourceStackName].length === 0) {
    return state;
  }

  let nextState = deepClone(prepareForShift ? prepareForShift(state) : state) as StateWithStacks;
  const diff = nextState[sourceStackName].pop();
  if (diff) {
    try {
      nextState = patcher.patch(nextState, diff) as StateWithStacks;
    } catch (error) {
      // The diff was computed against a state we can no longer reconstruct,
      // so it (and everything beneath it, which was recorded on top of it)
      // can't be applied. Drop the stacks rather than taking the editor down
      // with an unhandled exception.
      console.error("Undo/redo: discarding the stacks, a diff could not be applied.", error);
      return Object.assign({}, state, { undoStack: [], redoStack: [] });
    }
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
  /**
   * Called with the current state before an undo / redo diff is applied, to
   * give the caller a chance to return the state to the point the diff was
   * recorded at. (Ignored actions move the state without leaving a diff
   * behind, so it can have drifted since.)
   */
  prepareForShift?: (state: StateWithStacks) => StateWithStacks;
}

export const undoRedoReducerFactory = ({
  trackedKeys,
  ignoredActions = [],
  prepareForShift,
}: UndoRedoReducerConfig = {}) => {
  return (state: StateWithStacks, action: UndoRedoAction | { type: string }): StateWithStacks => {
    if (action.type === PERFORM_UNDO) {
      return shift(state, "undoStack", "redoStack", prepareForShift);
    }
    if (action.type === PERFORM_REDO) {
      return shift(state, "redoStack", "undoStack", prepareForShift);
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
  const diff = patcher.diff(
    omitDerivedState(after as StateWithStacks),
    omitDerivedState(before as StateWithStacks)
  );
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
