import React, { useContext } from "react";

import { ScenarioStage } from "./scenario-stage";

import { EvaluatedCondition, RuleTreeFlowItemCheck } from "../../../types";
import { FreeformConditionRow } from "../stage/recording/condition-rows";
import { InspectorContext } from "./inspector-context";

export const ContentFlowGroupCheck = ({ check }: { check: RuleTreeFlowItemCheck }) => {
  const { characters, world, evaluatedRuleDetailsForActor } = useContext(InspectorContext);

  // Build condition status map from evaluation details
  const conditionStatusMap: { [conditionKey: string]: EvaluatedCondition } = {};
  const checkDetails = evaluatedRuleDetailsForActor?.[check.id];
  if (checkDetails?.conditions) {
    for (const cond of checkDetails.conditions) {
      conditionStatusMap[cond.conditionKey] = cond;
    }
  }

  const conditions: React.ReactNode[] = [];
  check.conditions.forEach((condition) => {
    if (condition.enabled) {
      conditions.push(
        <FreeformConditionRow
          key={condition.key}
          actors={check.actors}
          world={world}
          condition={condition}
          characters={characters}
          conditionStatus={conditionStatusMap[condition.key]}
        />,
      );
    }
  });

  return (
    <div>
      {check.extent.xmax !== 0 ||
      check.extent.ymax !== 0 ||
      check.extent.ymin !== 0 ||
      check.extent.xmin !== 0 ? (
        <div className="scenario">
          <ScenarioStage rule={check} applyActions={false} maxWidth={75} maxHeight={75} />
          <div style={{ flex: 1 }} />
        </div>
      ) : undefined}
      {conditions.length > 0 && (
        <li className={`rule`} style={{ backgroundColor: `rgba(255,255,255,0.6)`, border: 0 }}>
          <ul className="conditions">{conditions}</ul>
        </li>
      )}
    </div>
  );
};
