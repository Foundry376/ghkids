import React from "react";
import { Characters, EvaluatedRuleDetailsMap, WorldMinimal } from "../../../types";

export const InspectorContext = React.createContext<{
  world: WorldMinimal;
  characters: Characters;
  evaluatedRuleDetailsForActor: EvaluatedRuleDetailsMap[""];
}>(new Error() as never);
