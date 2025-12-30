import { useContext } from "react";
import { InspectorContext } from "./inspector-context";

export const RuleStateCircle = ({ rule }: { rule: { id: string } }) => {
  const { evaluatedRuleDetailsForActor } = useContext(InspectorContext);
  const details = evaluatedRuleDetailsForActor?.[rule.id];
  const applied = details?.passed;
  return <div className={`circle ${applied}`} />;
};
