import React from 'react';

import { FreeformConditionRow } from "./condition-rows";

import { updateRecordingCondition } from "../../../actions/recording-actions";
import { getCurrentStageForWorld } from "../../../utils/selectors";
import { pointIsInside, toV2Condition } from "../../../utils/stage-helpers";

export class RecordingConditions extends React.Component {
  state = {
    dropping: false,
  };

  render() {
    // eslint-disable-next-line react/prop-types
    const { recording, characters, dispatch } = this.props;
    const { beforeWorld, conditions, extent } = recording;
    const stage = getCurrentStageForWorld(beforeWorld);

    const rows = [];
    Object.values(stage.actors).forEach((a) => {
      if (!pointIsInside(a.position, extent)) {
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
              condition={toV2Condition(key, value)}
              characters={characters}
              onChange={(enabled, rest) =>
                dispatch(
                  updateRecordingCondition(a.id, key, { enabled, ...rest })
                )
              }
            />
          );
        }
      });
    });

    return (
      <div
        style={{
          flex: 1,
          marginRight: 3,
          outline: this.state.dropping
            ? `2px solid rgba(91, 192, 222, 0.65)`
            : "none",
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("variable")) {
            e.preventDefault();
            this.setState({ dropping: true });
          }
        }}
        onDragExit={() => {
          this.setState({ dropping: false });
        }}
        onDrop={(e) => {
          const { type, value, actorId, variableId } = JSON.parse(
            e.dataTransfer.getData("variable")
          );
          this.setState({ dropping: false });
          if (
            conditions[actorId] &&
            Object.values(conditions[actorId]).some(
              (t) => t && t.type === type && t.variableId === variableId
            )
          ) {
            window.alert(
              `A condition for this actor ${type} has already been added to the list.`
            );
            return;
          }
          dispatch(
            updateRecordingCondition(actorId, `v2-${Date.now()}`, {
              enabled: true,
              type: type,
              comparator: "=",
              variableId: variableId,
              value: value,
            })
          );
        }}
      >
        <h2>When the picture matches and:</h2>
        <ul>{rows}</ul>
        {rows.length < 2 && (
          <div style={{ opacity: 0.5, marginTop: 8 }}>
            Double-click an actor in the picture above and drag in their
            variables to add conditions.
          </div>
        )}
      </div>
    );
  }
}
