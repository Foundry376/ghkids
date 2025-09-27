import classNames from "classnames";
import { useState } from "react";
import { useSelector } from "react-redux";
import Nav from "reactstrap/lib/Nav";
import NavItem from "reactstrap/lib/NavItem";
import NavLink from "reactstrap/lib/NavLink";

import AddRuleButton from "./add-rule-button";
import AddVariableButton from "./add-variable-button";
import { ContainerPaneRules } from "./container-pane-rules";
import { ContainerPaneVariables } from "./container-pane-variables";

import { EditorState } from "../../../types";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { InspectorContext } from "./inspector-context";

export const InspectorContainer = () => {
  const { ui, recording, world, characters } = useSelector<EditorState, EditorState>(
    (state) => state,
  );

  const isRecording = !!recording.characterId;
  const [activeTab, setActiveTab] = useState<"rules" | "variables">(
    isRecording ? "variables" : "rules",
  );

  const { worldId, actorIds } = ui.selectedActors ?? { worldId: null, actorIds: [] };

  // find the focused actor
  const focusedWorld =
    [recording.beforeWorld, recording.afterWorld].find((s) => s.id === worldId) || world;
  const focusedStage = getCurrentStageForWorld(focusedWorld)!;
  const focusedActor = (focusedStage?.actors || {})[actorIds[0]!] ?? null;
  const focusedCharacter = characters[ui.selectedCharacterId!] ?? null;

  // useEffect(() => {
  //   setActiveTab("variables");

  //   if (!isRecording) {
  //     setActiveTab("rules");
  //   }
  // }, [isRecording]);

  const ContentContainer = {
    rules: ContainerPaneRules,
    variables: ContainerPaneVariables,
  }[activeTab];

  const AddButton = {
    rules: AddRuleButton,
    variables: AddVariableButton,
  }[activeTab];

  return (
    <InspectorContext.Provider
      value={{
        world: focusedWorld,
        characters: characters,
        evaluatedRuleIdsForActor: focusedActor
          ? focusedWorld.evaluatedRuleIds[focusedActor.id]
          : {},
      }}
    >
      <div className={`panel inspector-panel-container tool-${ui.selectedToolId}`}>
        <Nav tabs>
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
          <div style={{ flex: 1 }} />
          <AddButton character={focusedCharacter} actor={focusedActor} isRecording={isRecording} />
        </Nav>
        <ContentContainer world={focusedWorld} character={focusedCharacter} actor={focusedActor} />
      </div>
    </InspectorContext.Provider>
  );
};
