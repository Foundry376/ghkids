import { useContext } from "react";
import { InspectorContext } from "./inspector-context";

export const RuleStateCircle = ({ rule }: { rule: { id: string } }) => {
  const { evaluatedRuleDetailsForActor } = useContext(InspectorContext);
  const details = evaluatedRuleDetailsForActor?.[rule.id];
  if (details === undefined) {
    return null;
  }
  return <div className={`circle ${details.passed}`} />;
};
