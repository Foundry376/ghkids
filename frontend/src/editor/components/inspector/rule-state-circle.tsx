import { useContext } from "react";
import { InspectorContext } from "./inspector-context";

export const RuleStateCircle = ({
  rule,
  onToggle,
}: {
  rule: { id: string; enabled?: boolean };
  onToggle?: () => void;
}) => {
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

  return (
    <button
      className={`rule-toggle-btn ${getCircleClass()}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
      title={isEnabled ? "Click to disable rule" : "Click to enable rule"}
    />
  );
};
