import classNames from "classnames";
import React from "react";
import { connect } from "react-redux";
import Nav from "reactstrap/lib/Nav";
import NavItem from "reactstrap/lib/NavItem";
import NavLink from "reactstrap/lib/NavLink";

import { getCurrentStageForWorld } from "../../utils/selectors";
import AddRuleButton from "./add-rule-button";
import AddVariableButton from "./add-variable-button";
import { ContainerPaneRules } from "./container-pane-rules";
import { ContainerPaneVariables } from "./container-pane-variables";

import { Dispatch } from "redux";
import { Actor, ActorPath, Character, Characters, EditorState, WorldMinimal } from "../../../types";
import { InspectorContext } from "./inspector-context";

interface InspectorContainerProps {
  dispatch: Dispatch;
  world: WorldMinimal;
  actor: Actor;
  characters: Characters;
  character: Character;
  selectedActorPath: ActorPath;
  selectedToolId: string;
  isRecording: boolean;
}
class Container extends React.Component<
  InspectorContainerProps,
  { activeTab: "variables" | "rules" }
> {
  constructor(props: InspectorContainerProps) {
    super(props);
    this.state = {
      activeTab: props.isRecording ? "variables" : "rules",
    };
  }

  componentDidUpdate(prevProps: InspectorContainerProps) {
    // BG Note: This should probably move to the app state
    if (
      prevProps.selectedActorPath !== this.props.selectedActorPath &&
      this.props.isRecording &&
      this.state.activeTab === "rules"
    ) {
      this.setState({ activeTab: "variables" });
    }
    if (prevProps.isRecording && !this.props.isRecording && this.state.activeTab === "variables") {
      this.setState({ activeTab: "rules" });
    }
  }
  _onChangeTab = (activeTab: "variables" | "rules") => {
    this.setState({ activeTab });
  };

  render() {
    const { character, selectedToolId, characters, world, actor, selectedActorPath, isRecording } =
      this.props;
    const { activeTab } = this.state;

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
          world: world,
          characters: characters,
          selectedToolId: selectedToolId,
          evaluatedRuleIdsForActor: actor ? world.evaluatedRuleIds[actor.id] : {},
        }}
      >
        <div className={`panel inspector-panel-container tool-${this.props.selectedToolId}`}>
          <Nav tabs>
            <NavItem>
              <NavLink
                className={classNames({ active: activeTab === "rules" })}
                onClick={() => this._onChangeTab("rules")}
              >
                Rules
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                className={classNames({ active: activeTab === "variables" })}
                onClick={() => this._onChangeTab("variables")}
              >
                Variables
              </NavLink>
            </NavItem>
            <div style={{ flex: 1 }} />
            <AddButton character={character} actor={actor} isRecording={isRecording} />
          </Nav>
          <ContentContainer
            world={world}
            character={character}
            actor={actor}
            selectedActorPath={selectedActorPath}
          />
        </div>
      </InspectorContext.Provider>
    );
  }
}

function mapStateToProps({ world, ui, characters, recording }: EditorState) {
  const { worldId, actorId } = ui.selectedActorPath;

  // find the focused actor
  const focusedWorld =
    [recording.beforeWorld, recording.afterWorld].find((s) => s.id === worldId) || world;
  const focusedStage = getCurrentStageForWorld(focusedWorld)!;
  const focusedActor = (focusedStage?.actors || {})[actorId!];

  return Object.assign({}, ui, {
    actor: focusedActor,
    world: focusedWorld,
    characters: characters,
    character: characters[ui.selectedCharacterId!],
    selectedToolId: ui.selectedToolId,
    selectedActorPath: ui.selectedActorPath,
    isRecording: recording.characterId !== null,
  });
}

export default connect(mapStateToProps)(Container);
