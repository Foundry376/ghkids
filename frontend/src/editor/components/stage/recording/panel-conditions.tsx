import React, { useState } from "react";

import { FreeformConditionRow, GlobalConditionRow } from "./condition-rows";

import { useDispatch } from "react-redux";
import { Characters, RecordingState } from "../../../../types";
import { updateRecordingCondition } from "../../../actions/recording-actions";
import { getCurrentStageForWorld } from "../../../utils/selectors";
import { actorIntersectsExtent, toV2Condition } from "../../../utils/stage-helpers";

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
    return;
  }

  const rows: React.ReactNode[] = [];

  Object.entries(conditions.globals || {}).forEach(([key, value]) => {
    rows.push(
      <GlobalConditionRow
        key={`global-${key}`}
        actors={stage.actors}
        world={beforeWorld}
        condition={value}
        characters={characters}
        onChange={(enabled, rest) =>
          dispatch(updateRecordingCondition("globals", key, { ...(rest || value), enabled }))
        }
      />,
    );
  });

  Object.values(stage.actors).forEach((a) => {
    if (!actorIntersectsExtent(a, characters, extent)) {
      return;
    }
    const saved = conditions[a.id] || {};

    Object.entries(saved).forEach(([key, value]) => {
      if (value.enabled) {
        rows.push(
          <FreeformConditionRow
            key={`${a.id}-${key}`}
            actor={a}
            actors={stage.actors}
            world={beforeWorld}
            condition={toV2Condition(key, value)!}
            characters={characters}
            onChange={(enabled, rest) =>
              dispatch(updateRecordingCondition(a.id, key, { enabled, ...rest }))
            }
          />,
        );
      }
    });
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
        const { type, value, actorId, variableId, globalId } = JSON.parse(
          e.dataTransfer.getData("variable"),
        );
        setDropping(false);

        if (
          globalId &&
          Object.values(conditions.globals || {}).some(
            (t) => t && t.type === type && t.globalId === globalId,
          )
        ) {
          window.alert(`A condition for this global has already been added to the list.`);
          return;
        }

        if (
          variableId &&
          conditions[actorId] &&
          Object.values(conditions[actorId]).some(
            (t) =>
              t &&
              "type" in t &&
              t.type === type &&
              "variableId" in t &&
              t.variableId === variableId,
          )
        ) {
          window.alert(`A condition for this actor ${type} has already been added to the list.`);
          return;
        }

        dispatch(
          updateRecordingCondition(globalId ? "globals" : actorId, `v2-${Date.now()}`, {
            enabled: true,
            type: type,
            comparator: "=",
            variableId: variableId,
            globalId: globalId,
            value: value,
          }),
        );
      }}
    >
      <h2>When the picture matches and:</h2>
      <ul>{rows}</ul>
      {rows.length < 2 && (
        <div style={{ opacity: 0.5, marginTop: 8 }}>
          Double-click an actor in the picture above and drag in their variables to add conditions.
        </div>
      )}
    </div>
  );
};
