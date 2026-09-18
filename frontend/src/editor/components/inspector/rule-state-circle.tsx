import { useContext } from "react";
import { InspectorContext } from "./inspector-context";

export const RuleStateCircle = ({ rule }: { rule: { id: string; enabled?: boolean } }) => {
  const { evaluatedRuleDetailsForActor } = useContext(InspectorContext);
  const details = evaluatedRuleDetailsForActor?.[rule.id];
  const isEnabled = rule.enabled !== false;

  // When rule is disabled, show a gray/muted circle regardless of evaluation
  // When enabled, show the evaluation result (or nothing if not evaluated)
  const getCircleClass = () => {
    if (!isEnabled) {
      return "circle disabled";
    }
    if (details === undefined) {
      return "circle";
    }
    return `circle ${details.passed}`;
  };

  return <span className={`rule-state-circle ${getCircleClass()}`} aria-hidden="true" />;
};
