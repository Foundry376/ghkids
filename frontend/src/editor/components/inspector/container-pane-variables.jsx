import React, {PropTypes} from 'react';

import ButtonDropdown from 'reactstrap/lib/ButtonDropdown';
import DropdownItem from 'reactstrap/lib/DropdownItem';
import DropdownMenu from 'reactstrap/lib/DropdownMenu';
import DropdownToggle from 'reactstrap/lib/DropdownToggle';

import {changeActor} from '../../actions/stage-actions';
import {upsertGlobal, deleteGlobal} from '../../actions/world-actions';
import {changeCharacter, deleteCharacterVariable} from '../../actions/characters-actions';
import VariableGridItem from './variable-grid-item';
import {selectToolId} from '../../actions/ui-actions';
import {TOOL_TRASH, TOOL_POINTER} from '../../constants/constants';
import * as CustomPropTypes from '../../constants/custom-prop-types';
import Sprite from '../sprites/sprite';


function coerceToType(value, type) {
  if (type === 'number') {
    return (value !== '' && `${value / 1}` === value) ? value / 1 : undefined;
  }
  return value;
}


class AppearanceGridItem extends React.Component {
  static propTypes = {
    spritesheet: PropTypes.object,
    appearanceId: PropTypes.string,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const {spritesheet, appearanceId, onChange} = this.props;

    return (
      <div className={`variable-box variable-set-true`}>
        <div className="name">Appearance</div>
        <ButtonDropdown
          size="sm"
          isOpen={this.state.open}
          toggle={() => this.setState({open: !this.state.open})}
        >
          <DropdownToggle caret>
            <Sprite spritesheet={spritesheet} appearance={appearanceId} />
          </DropdownToggle>
          <DropdownMenu className="with-sprites">
          {Object.keys(spritesheet.appearances).map(id =>
            <DropdownItem onClick={() => onChange({target: {value: id}})} key={id}>
              <Sprite spritesheet={spritesheet} appearance={id} />
            </DropdownItem>
          )}
          </DropdownMenu>
        </ButtonDropdown>
      </div>
    );
  }
}

class TransformGridItem extends React.Component {
  static propTypes = {
    spritesheet: PropTypes.object,
    appearanceId: PropTypes.string,
    transform: PropTypes.string,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {};
  }

  render() {
    const {transform, spritesheet, appearanceId, onChange} = this.props;

    return (
      <div className={`variable-box variable-set-true`}>
        <div className="name">Direction</div>
        <ButtonDropdown
          size="sm"
          isOpen={this.state.open}
          toggle={() => this.setState({open: !this.state.open})}
        >
          <DropdownToggle caret>
            <Sprite spritesheet={spritesheet} appearance={appearanceId} transform={transform} />
          </DropdownToggle>
          <DropdownMenu className="with-sprites">
          {['none', 'flip-x', 'flip-y', 'flip-xy'].map(option =>
            <DropdownItem onClick={() => onChange({target: {value: option}})} key={option}>
              <Sprite spritesheet={spritesheet} appearance={appearanceId} transform={option} />
            </DropdownItem>
          )}
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
    if (this.context.selectedToolId === TOOL_TRASH) {
      const {character, dispatch} = this.props;
      dispatch(deleteCharacterVariable(character.id, id));
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOL_POINTER));
      }
    }
  }

  _onChangeVarDefinition = (id, changes) => {
    const {character, dispatch} = this.props;
    dispatch(changeCharacter(character.id, {
      variables: {
        [id]: changes,
      },
    }));
  }

  _onChangeVarValue = (id, value) => {
    const {dispatch, selectedActorPath} = this.props;
    if (!selectedActorPath.actorId) {
      this._onChangeVarDefinition(id, {defaultValue: value});
      return;
    }
    dispatch(changeActor(selectedActorPath, {
      variableValues: {
        [id]: value,
      },
    }));
  }
  
  // Globals

  _onChangeGlobalDefinition = (globalId, changes) => {
    this.props.dispatch(upsertGlobal(this.props.world.id, globalId, changes));
  }

  _onClickGlobal = (globalId) => {
    if (this.context.selectedToolId === TOOL_TRASH) {
      this.props.dispatch(deleteGlobal(this.props.world.id, globalId));
      if (!event.shiftKey) {
        this.props.dispatch(selectToolId(TOOL_POINTER));
      }
    }
  }

  _renderCharacterSection() {
    const {character, actor, dispatch, selectedActorPath} = this.props;
    if (!character) {
      return (
        <div className="empty">
          Please select a character.
        </div>
      );
    }

    const actorValues = actor ? actor.variableValues : {};

    return (
      <div className="variables-grid">
        { actor && (
          <AppearanceGridItem
            appearanceId={actor.appearance}
            spritesheet={character.spritesheet}
            onChange={(e) => {
              dispatch(changeActor(selectedActorPath, {appearance: e.target.value}));
            }}
          />
        )}
        { actor && (
          <TransformGridItem
            transform={actor.transform}
            appearanceId={actor.appearance}
            spritesheet={character.spritesheet}
            onChange={(e) => {
              dispatch(changeActor(selectedActorPath, {transform: e.target.value}));
            }}
          />
        )}
        {Object.values(character.variables).map((definition) =>
          <VariableGridItem
            key={definition.id}
            definition={definition}
            value={actorValues[definition.id]}
            onChangeDefinition={this._onChangeVarDefinition}
            onChangeValue={this._onChangeVarValue}
            onBlurValue={(id, value) => this._onChangeVarValue(id, coerceToType(value, definition.type))}
            onClick={this._onClickVar}
          />
        )}
      </div>
    );
  }

  _renderWorldSection() {
    return (
      <div className="variables-grid">
        {Object.values(this.props.world.globals).map((definition) =>
          <VariableGridItem
            key={definition.id}
            definition={definition}
            value={definition.value || ''}
            onChangeDefinition={this._onChangeGlobalDefinition}
            onChangeValue={(id, value) =>
              this._onChangeGlobalDefinition(id, {value})
            }
            onBlurValue={(id, value) =>
              this._onChangeGlobalDefinition(id, {value: coerceToType(value, definition.type)})
            }
            onClick={this._onClickGlobal}
          />
        )}
      </div>
    );
  }

  render() {
    return (
      <div className={`scroll-container`}>
        <div className="scroll-container-contents">
          <div className="variables-section">
            <h3>Actor</h3>
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
