import React, { useState } from "react";

import { FreeformConditionRow } from "./condition-rows";

import { useDispatch } from "react-redux";
import { Characters, RecordingState } from "../../../../types";
import { upsertRecordingCondition } from "../../../actions/recording-actions";
import { getCurrentStageForWorld } from "../../../utils/selectors";
import { actorIntersectsExtent } from "../../../utils/stage-helpers";

export const RecordingConditions = ({
  recording,
  characters,
}: {
  recording: RecordingState;
  characters: Characters;
}) => {
  const dispatch = useDispatch();
  const [dropping, setDropping] = useState(false);

  const { beforeWorld, conditions, extent } = recording;
  const stage = getCurrentStageForWorld(beforeWorld);
  if (!stage) {
    return <span />;
  }

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
              key: `v3-${Date.now()}`,
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
