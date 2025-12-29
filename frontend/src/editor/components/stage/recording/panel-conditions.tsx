import React, { useState } from "react";

import { FreeformConditionRow } from "./condition-rows";

import { useDispatch, useSelector } from "react-redux";
import {
  Characters,
  EditorState,
  EvaluatedCondition,
  EvaluatedRuleDetailsMap,
  RecordingState,
  UIState,
  World,
} from "../../../../types";
import { upsertRecordingCondition } from "../../../actions/recording-actions";
import { getCurrentStageForWorld } from "../../../utils/selectors";
import { actorIntersectsExtent } from "../../../utils/stage-helpers";
import { makeId } from "../../../utils/utils";

/**
 * Builds a map of condition key -> evaluation status by looking up the rule's
 * evaluation data from the main world. Tries the selected actor on the main
 * stage first, then falls back to finding any actor with data for this rule.
 */
function buildConditionStatusMap(
  ruleId: string | null,
  evaluatedRuleDetails: EvaluatedRuleDetailsMap,
  selectedActors: UIState["selectedActors"],
): { [conditionKey: string]: EvaluatedCondition } {
  if (!ruleId) {
    return {};
  }

  // Try to get evaluation data from the selected actor on the main stage
  let evalActorId: string | null = null;

  if (selectedActors?.worldId === "root" && selectedActors.actorIds[0]) {
    evalActorId = selectedActors.actorIds[0];
  } else {
    // Fall back: find any actor that has evaluation data for this rule
    for (const actorId of Object.keys(evaluatedRuleDetails || {})) {
      if (evaluatedRuleDetails[actorId]?.[ruleId]) {
        evalActorId = actorId;
        break;
      }
    }
  }

  if (!evalActorId) {
    return {};
  }

  const ruleDetails = evaluatedRuleDetails[evalActorId]?.[ruleId];
  if (!ruleDetails?.conditions) {
    return {};
  }

  const map: { [conditionKey: string]: EvaluatedCondition } = {};
  for (const cond of ruleDetails.conditions) {
    map[cond.conditionKey] = cond;
  }
  return map;
}

export const RecordingConditions = ({
  recording,
  characters,
}: {
  recording: RecordingState;
  characters: Characters;
}) => {
  const dispatch = useDispatch();
  const [dropping, setDropping] = useState(false);

  // Get the main world to access evaluation details
  const world = useSelector<EditorState, World>((state) => state.world);
  const selectedActors = useSelector<EditorState, EditorState["ui"]["selectedActors"]>(
    (state) => state.ui.selectedActors,
  );

  const { beforeWorld, conditions, extent } = recording;
  const stage = getCurrentStageForWorld(beforeWorld);
  if (!stage) {
    return <span />;
  }

  const conditionStatusMap = buildConditionStatusMap(
    recording.ruleId,
    world.evaluatedRuleDetails,
    selectedActors,
  );

  const rows: React.ReactNode[] = [];

  conditions.forEach((condition) => {
    const a = "actorId" in condition.left ? stage.actors[condition.left.actorId] : null;
    if (a && !actorIntersectsExtent(a, characters, extent)) {
      return;
    }
    const b = "actorId" in condition.right ? stage.actors[condition.right.actorId] : null;
    if (b && !actorIntersectsExtent(b, characters, extent)) {
      return;
    }

    if (condition.enabled) {
      rows.push(
        <FreeformConditionRow
          key={condition.key}
          actors={stage.actors}
          world={beforeWorld}
          condition={condition}
          characters={characters}
          conditionStatus={conditionStatusMap[condition.key]}
          onChange={(enabled, rest) => dispatch(upsertRecordingCondition({ ...rest, enabled }))}
        />,
      );
    }
  });

  return (
    <div
      style={{
        flex: 1,
        marginRight: 3,
        outline: dropping ? `2px solid rgba(91, 192, 222, 0.65)` : "none",
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("variable")) {
          e.preventDefault();
          setDropping(true);
        }
      }}
      onDragExit={() => {
        setDropping(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("variable")) {
          const { value, actorId, variableId, globalId } = JSON.parse(
            e.dataTransfer.getData("variable"),
          );
          setDropping(false);

          dispatch(
            upsertRecordingCondition({
              enabled: true,
              key: makeId("condition"),
              comparator: "=",
              left: globalId ? { globalId } : { actorId, variableId },
              right: { constant: value },
            }),
          );
        }
      }}
    >
      <h2>When the picture matches and:</h2>
      <ul>{rows}</ul>
      {rows.length < 2 && (
        <div style={{ opacity: 0.5, marginTop: 8 }}>
          Click an actor in the picture above and drag in their variables to add conditions.
        </div>
      )}
    </div>
  );
};
