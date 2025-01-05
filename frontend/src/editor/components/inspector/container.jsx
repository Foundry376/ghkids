import classNames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import { connect } from 'react-redux';
import Nav from 'reactstrap/lib/Nav';
import NavItem from 'reactstrap/lib/NavItem';
import NavLink from 'reactstrap/lib/NavLink';

import { getCurrentStageForWorld } from "../../utils/selectors";
import AddRuleButton from "./add-rule-button";
import AddVariableButton from "./add-variable-button";
import ContainerPaneRules from "./container-pane-rules";
import ContainerPaneVariables from "./container-pane-variables";

import * as CustomPropTypes from "../../constants/custom-prop-types";

class Container extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    world: PropTypes.object,
    actor: PropTypes.object,
    characters: PropTypes.object,
    character: PropTypes.object,
    selectedActorPath: CustomPropTypes.WorldSelection,
    selectedToolId: PropTypes.string,
    isRecording: PropTypes.bool,
  };

  static childContextTypes = {
    characters: PropTypes.object,
    evaluatedRuleIdsForActor: PropTypes.object,
    selectedToolId: PropTypes.string,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      activeTab: props.isRecording ? "variables" : "rules",
    };
  }

  getChildContext() {
    const { characters, selectedToolId, world, actor } = this.props;

    return {
      characters: characters,
      selectedToolId: selectedToolId,
      evaluatedRuleIdsForActor: actor ? world.evaluatedRuleIds[actor.id] : {},
    };
  }

  componentDidUpdate(prevProps) {
    // BG Note: This should probably move to the app state
    if (
      prevProps.selectedActorPath !== this.props.selectedActorPath &&
      this.props.isRecording &&
      this.state.activeTab === "rules"
    ) {
      this.setState({ activeTab: "variables" });
    }
    if (
      prevProps.isRecording &&
      !this.props.isRecording &&
      this.state.activeTab === "variables"
    ) {
      this.setState({ activeTab: "rules" });
    }
  }
  _onChangeTab = (activeTab) => {
    this.setState({ activeTab });
  };

  render() {
    const {
      character,
      world,
      actor,
      dispatch,
      selectedActorPath,
      isRecording,
    } = this.props;
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
      <div
        className={`panel inspector-panel-container tool-${this.props.selectedToolId}`}
      >
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
          <div style={{ float: "right" }}>
            <AddButton
              character={character}
              actor={actor}
              dispatch={dispatch}
              isRecording={isRecording}
            />
          </div>
        </Nav>
        <ContentContainer
          world={world}
          character={character}
          actor={actor}
          selectedActorPath={selectedActorPath}
          dispatch={dispatch}
        />
      </div>
    );
  }
}

function mapStateToProps({ world, ui, characters, recording }) {
  const { worldId, actorId } = ui.selectedActorPath;

  // find the focused actor
  const focusedWorld =
    [recording.beforeWorld, recording.afterWorld].find(
      (s) => s.id === worldId
    ) || world;
  const focusedStage = getCurrentStageForWorld(focusedWorld);
  const focusedActor = (focusedStage.actors || {})[actorId];

  return Object.assign({}, ui, {
    actor: focusedActor,
    world: focusedWorld,
    characters: characters,
    character: characters[ui.selectedCharacterId],
    selectedToolId: ui.selectedToolId,
    selectedActorPath: ui.selectedActorPath,
    isRecording: recording.characterId !== null,
  });
}

export default connect(mapStateToProps)(Container);
