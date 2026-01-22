import { STAGE_CELL_SIZE } from "../../constants/constants";
import WorldOperator from "../../utils/world-operator";
import ActorSprite from "../sprites/actor-sprite";

import React from "react";
import { Rule, RuleTreeFlowItemCheck, WorldMinimal } from "../../../types";
import { extentIgnoredPositions } from "../../utils/recording-helpers";
import { getCurrentStageForWorld } from "../../utils/selectors";
import RecordingIgnoredSprite from "../sprites/recording-ignored-sprite";

export const ScenarioStage = React.memo(
  ({
    rule,
    applyActions,
    maxWidth,
    maxHeight,
  }: {
    rule: Rule | RuleTreeFlowItemCheck;
    applyActions: boolean;
    maxWidth: number;
    maxHeight: number;
  }) => {
    const { world, characters } = window.editorStore!.getState();

    const { xmin, xmax, ymin, ymax } = rule.extent;
    const width = (xmax - xmin + 1) * STAGE_CELL_SIZE;
    const height = (ymax - ymin + 1) * STAGE_CELL_SIZE;
    const zoom = Math.min(maxWidth / width, maxHeight / height, 1);

    const ruleWorld = WorldOperator(world, characters).resetForRule(rule, {
      applyActions,
      offset: { x: -xmin, y: -ymin },
    });
    const ruleStage = getCurrentStageForWorld(ruleWorld as WorldMinimal);
    if (!ruleStage) {
      return null;
    }
    return (
      <div className="scenario-stage" style={{ width, height, zoom }}>
        {Object.keys(ruleStage.actors).map((id) => (
          <ActorSprite
            key={id}
            character={characters[ruleStage.actors[id].characterId]}
            actor={ruleStage.actors[id]}
          />
        ))}
        {extentIgnoredPositions(rule.extent).map(({ x, y }) => (
          <RecordingIgnoredSprite key={`ignored-${x}-${y}`} x={x - xmin} y={y - ymin} />
        ))}
      </div>
    );
  },
);
