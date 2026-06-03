import { Nav, NavItem, NavLink } from "reactstrap";
import classNames from "classnames";
import { useEffect, useState } from "react";

import { ContainerPaneRules } from "./container-pane-rules";
import { ContainerPaneVariables } from "./container-pane-variables";

import { useEditorSelector } from "../../../hooks/redux";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { InspectorContext } from "./inspector-context";

export const InspectorContainer = () => {
  const { ui, recording, world, characters } = useEditorSelector((state) => state);

  const isRecording = !!recording.characterId;
  const [activeTab, setActiveTab] = useState<"rules" | "variables">(
    isRecording ? "variables" : "rules",
  );

  const { worldId, actorIds } = ui.selectedActors ?? { worldId: null, actorIds: [] };

  // find the focused actor(s)
  const focusedWorld =
    [recording.beforeWorld, recording.afterWorld].find((s) => s.id === worldId) || world;
  const focusedStage = getCurrentStageForWorld(focusedWorld)!;
  const stageActors = focusedStage?.actors || {};
  const focusedActors = actorIds.map((id) => stageActors[id]).filter((a): a is NonNullable<typeof a> => !!a);
  const focusedActor = focusedActors[0] ?? null;
  const focusedCharacter = characters[ui.selectedCharacterId!] ?? null;

  // When you enter and exit recording mode, switch to the relevant tab
  useEffect(() => {
    setActiveTab(isRecording ? "variables" : "rules");
  }, [isRecording]);

  const ContentContainer = {
    rules: ContainerPaneRules,
    variables: ContainerPaneVariables,
  }[activeTab];

  const isReadonly = isRecording && worldId === recording.beforeWorld.id;

  return (
    <InspectorContext.Provider
      value={{
        world: focusedWorld,
        characters: characters,
        evaluatedRuleDetailsForActor:
          focusedActor && focusedWorld.evaluatedRuleDetails
            ? focusedWorld.evaluatedRuleDetails[focusedActor.id]
            : {},
      }}
    >
      <div className={`panel inspector-panel-container tool-supported`}>
        <Nav tabs className="inspector-top-tabs">
          <NavItem>
            <NavLink
              className={classNames({ active: activeTab === "rules" })}
              onClick={() => setActiveTab("rules")}
            >
              Rules
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink
              className={classNames({ active: activeTab === "variables" })}
              onClick={() => setActiveTab("variables")}
            >
              Variables
            </NavLink>
          </NavItem>
        </Nav>
        <ContentContainer world={focusedWorld} character={focusedCharacter} actor={focusedActor} actors={focusedActors} readonly={isReadonly} />
      </div>
    </InspectorContext.Provider>
  );
};
