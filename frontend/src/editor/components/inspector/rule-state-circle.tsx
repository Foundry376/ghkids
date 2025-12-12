import { useContext } from "react";
import { InspectorContext } from "./inspector-context";

export const RuleStateCircle = ({ rule }: { rule: { id: string } }) => {
  const { evaluatedRuleIdsForActor } = useContext(InspectorContext);
  const applied = evaluatedRuleIdsForActor?.[rule.id];
  return <div className={`circle ${applied}`} />;
};
