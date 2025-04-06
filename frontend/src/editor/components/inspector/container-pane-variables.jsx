import PropTypes from "prop-types";
import React from "react";

import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";

import { changeCharacter, deleteCharacterVariable } from "../../actions/characters-actions";
import { changeActor } from "../../actions/stage-actions";
import { selectToolId } from "../../actions/ui-actions";
import { deleteGlobal, upsertGlobal } from "../../actions/world-actions";
import { TOOLS } from "../../constants/constants";
import * as CustomPropTypes from "../../constants/custom-prop-types";
import Sprite from "../sprites/sprite";
import { TransformImages } from "./transform-images";
import VariableGridItem from "./variable-grid-item";

function coerceToType(value, type) {
  if (type === "number") {
    return value !== "" && `${Number(value)}` === value ? Number(value) : undefined;
  }
  return value;
}

class AppearanceGridItem extends React.Component {
  static propTypes = {
    spritesheet: PropTypes.object,
    actorId: PropTypes.string,
    appearanceId: PropTypes.string,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {};
  }

  _onDragStart = (event) => {
    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify({
        type: "appearance",
        actorId: this.props.actorId,
        value: {},
      }),
    );
    event.dataTransfer.setData("variable-type:appearance", "true");
  };

  render() {
    const { spritesheet, appearanceId, onChange } = this.props;

    return (
      <div className={`variable-box variable-set-true`} draggable onDragStart={this._onDragStart}>
        <div className="name">Appearance</div>
        <ButtonDropdown
          size="sm"
          isOpen={this.state.open}
          toggle={() => this.setState({ open: !this.state.open })}
        >
          <DropdownToggle caret>
            <Sprite spritesheet={spritesheet} appearance={appearanceId} fit />
          </DropdownToggle>
          <DropdownMenu className="with-sprites">
            {Object.keys(spritesheet.appearances).map((id) => (
              <DropdownItem onClick={() => onChange({ target: { value: id } })} key={id}>
                <Sprite spritesheet={spritesheet} appearance={id} fit />
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ButtonDropdown>
      </div>
    );
  }
}

class TransformGridItem extends React.Component {
  static propTypes = {
    spritesheet: PropTypes.object,
    actorId: PropTypes.string,
    appearanceId: PropTypes.string,
    transform: PropTypes.string,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {};
  }

  _onDragStart = (event) => {
    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify({
        type: "transform",
        actorId: this.props.actorId,
        value: {},
      }),
    );
    event.dataTransfer.setData("variable-type:transform", "true");
  };

  render() {
    const { transform, onChange } = this.props;

    return (
      <div className={`variable-box variable-set-true`} draggable onDragStart={this._onDragStart}>
        <div className="name">Direction</div>
        <ButtonDropdown
          size="sm"
          isOpen={this.state.open}
          toggle={() => this.setState({ open: !this.state.open })}
        >
          <DropdownToggle caret>{TransformImages[transform || "none"]}</DropdownToggle>
          <DropdownMenu className="with-sprites">
            {["none", "90deg", "270deg", "180deg", "flip-x", "flip-y"].map((option) => (
              <DropdownItem onClick={() => onChange({ target: { value: option } })} key={option}>
                {TransformImages[option]}
              </DropdownItem>
            ))}
          </DropdownMenu>
        </ButtonDropdown>
      </div>
    );
  }
}

export default class ContainerPaneVariables extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
    world: PropTypes.object,
    selectedActorPath: CustomPropTypes.WorldSelection,
    dispatch: PropTypes.func,
  };

  static contextTypes = {
    selectedToolId: PropTypes.string,
  };

  // Chararacter and actor variables

  _onClickVar = (id, event) => {
    if (this.context.selectedToolId === TOOLS.TRASH) {
      const { character, dispatch } = this.props;
      dispatch(deleteCharacterVariable(character.id, id));
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  _onChangeVarDefinition = (id, changes) => {
    const { character, dispatch } = this.props;
    dispatch(
      changeCharacter(character.id, {
        variables: {
          [id]: changes,
        },
      }),
    );
  };

  _onChangeVarValue = (id, value) => {
    const { dispatch, selectedActorPath } = this.props;
    if (!selectedActorPath.actorId) {
      this._onChangeVarDefinition(id, { defaultValue: value });
      return;
    }
    dispatch(
      changeActor(selectedActorPath, {
        variableValues: {
          [id]: value,
        },
      }),
    );
  };

  // Globals

  _onChangeGlobalDefinition = (globalId, changes) => {
    this.props.dispatch(upsertGlobal(this.props.world.id, globalId, changes));
  };

  _onClickGlobal = (globalId) => {
    if (this.context.selectedToolId === TOOLS.TRASH) {
      this.props.dispatch(deleteGlobal(this.props.world.id, globalId));
      if (!event.shiftKey) {
        this.props.dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  _renderCharacterSection() {
    const { character, actor, dispatch, selectedActorPath } = this.props;
    if (!character) {
      return <div className="empty">Please select a character.</div>;
    }

    const actorValues = actor ? actor.variableValues : {};

    return (
      <div className="variables-grid">
        {actor && (
          <AppearanceGridItem
            actorId={actor.id}
            appearanceId={actor.appearance}
            spritesheet={character.spritesheet}
            onChange={(e) => {
              dispatch(changeActor(selectedActorPath, { appearance: e.target.value }));
            }}
          />
        )}
        {actor && (
          <TransformGridItem
            transform={actor.transform}
            actorId={actor.id}
            appearanceId={actor.appearance}
            spritesheet={character.spritesheet}
            onChange={(e) => {
              dispatch(changeActor(selectedActorPath, { transform: e.target.value }));
            }}
          />
        )}
        {Object.values(character.variables).map((definition) => (
          <VariableGridItem
            disabled={this.context.selectedToolId !== TOOLS.POINTER}
            draggable={!!actor && this.context.selectedToolId === TOOLS.POINTER}
            actorId={actor ? actor.id : null}
            key={definition.id}
            definition={definition}
            value={actorValues[definition.id]}
            onClick={this._onClickVar}
            onChangeDefinition={this._onChangeVarDefinition}
            onChangeValue={this._onChangeVarValue}
            onBlurValue={(id, value) =>
              this._onChangeVarValue(id, coerceToType(value, definition.type))
            }
          />
        ))}
        {Object.values(character.variables).length === 0 && (
          <div className="empty">
            Add variables (like "age" or "health") that each {character.name} will have.
          </div>
        )}
      </div>
    );
  }

  _renderWorldSection() {
    return (
      <div className="variables-grid">
        {Object.values(this.props.world.globals).map((definition) => (
          <VariableGridItem
            draggable={true}
            disabled={this.context.selectedToolId !== TOOLS.POINTER}
            key={definition.id}
            definition={definition}
            value={definition.value || ""}
            onClick={this._onClickGlobal}
            onChangeDefinition={this._onChangeGlobalDefinition}
            onChangeValue={(id, value) => this._onChangeGlobalDefinition(id, { value })}
            onBlurValue={(id, value) =>
              this._onChangeGlobalDefinition(id, {
                value: coerceToType(value, definition.type),
              })
            }
          />
        ))}
      </div>
    );
  }

  render() {
    const { character, actor } = this.props;
    return (
      <div className={`scroll-container`}>
        <div className="scroll-container-contents">
          <div className="variables-section">
            <h3>
              {actor
                ? `${character.name} at (${actor.position.x},${actor.position.y})`
                : `${character.name} (Defaults)`}
            </h3>
            {this._renderCharacterSection()}
          </div>
          <div className="variables-section">
            <h3>World</h3>
            {this._renderWorldSection()}
          </div>
        </div>
      </div>
    );
  }
}
