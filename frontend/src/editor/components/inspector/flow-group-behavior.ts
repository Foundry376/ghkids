import { RuleTreeFlowItem } from "../../../types";
import { FLOW_BEHAVIORS } from "../../utils/world-constants";

export function changesForFlowBehavior(
  rule: RuleTreeFlowItem,
  behavior: RuleTreeFlowItem["behavior"],
): Partial<RuleTreeFlowItem> {
  return {
    behavior,
    loopCount:
      behavior === FLOW_BEHAVIORS.LOOP
        ? ("loopCount" in rule ? rule.loopCount : undefined) ?? { constant: 2 }
        : undefined,
  };
}
