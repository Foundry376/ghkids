import u from "updeep";

import { Position, Stage } from "../../types";
import { Actions } from "../actions";
import * as Types from "../constants/action-types";
import { pointByAdding, positionDeltaForAnchorChange } from "../utils/stage-helpers";

export default function stageReducer(state: Stage, action: Actions) {
  if ("stageId" in action && action.stageId && action.stageId !== state.id) {
    return state;
  }

  switch (action.type) {
    case Types.UPSERT_ACTORS: {
      let next = state;
      for (const { id, values } of action.upserts) {
        next = u({ actors: u.updateIn(id, values) }, next) as Stage;
      }
      return next;
    }
    case Types.ADJUST_FOR_APPEARANCE_ANCHOR_CHANGE: {
      // Moving an appearance's anchor shifts where its artwork renders relative
      // to an actor's position, so nudge placed actors by the same (transform-
      // aware) delta to keep them in the same squares.
      const { prevAnchor, nextAnchor } = action;
      if (prevAnchor.x === nextAnchor.x && prevAnchor.y === nextAnchor.y) {
        return state;
      }
      const updates: Record<string, { position: Position }> = {};
      for (const [id, actor] of Object.entries(state.actors)) {
        if (actor.characterId === action.characterId && actor.appearance === action.appearanceId) {
          const d = positionDeltaForAnchorChange(prevAnchor, nextAnchor, actor.transform);
          updates[id] = { position: pointByAdding(actor.position, d) };
        }
      }
      if (Object.keys(updates).length === 0) {
        return state;
      }
      return u({ actors: updates }, state) as Stage;
    }
    case Types.DELETE_ACTORS: {
      return u(
        {
          actors: u.omit(action.actorIds),
        },
        state,
      );
    }
    case Types.DELETE_CHARACTER: {
      return u(
        {
          actors: u.omitBy((value) => value.characterId === action.characterId),
        },
        state,
      );
    }
    case Types.UPDATE_STAGE_SETTINGS: {
      return u(action.settings, state);
    }
    default:
      return state;
  }
}
