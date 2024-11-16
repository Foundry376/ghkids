import React, {PropTypes} from 'react';

import {TransformBlock, AppearanceBlock, VariableBlock, ActorBlock} from './blocks';

export class AppearanceConditionRow extends React.Component {
  static propTypes = {
    actor: PropTypes.object,
    character: PropTypes.object,
    enabled: PropTypes.bool,
    onChange: PropTypes.func,
    appearance: PropTypes.string,
  };

  static defaultProps = {
    enabled: false,
  }

  render() {
    const {appearance, actor, character, enabled, onChange} = this.props;

    return (
      <li className={`enabled-${this.props.enabled}`}>
        <div className="left">
          <ActorBlock character={character} actor={actor} />
          appearance is
          <AppearanceBlock character={character} appearanceId={appearance} />
        </div>
        {onChange && (
          <div onClick={() => onChange(!enabled)} className="condition-toggle"><div /></div>
        )}
      </li>
    );
  }
}

export class TransformConditionRow extends React.Component {
  static propTypes = {
    actor: PropTypes.object,
    character: PropTypes.object,
    enabled: PropTypes.bool,
    onChange: PropTypes.func,
    transform: PropTypes.string,
  };

  static defaultProps = {
    enabled: false,
  }

  render() {
    const {transform, actor, character, enabled, onChange} = this.props;

    return (
      <li className={`enabled-${this.props.enabled}`}>
        <div className="left">
          <ActorBlock character={character} actor={actor} />
          is facing
          <TransformBlock character={character} appearanceId={actor.appearance} transform={transform} />
        </div>
        {onChange && (
          <div onClick={() => onChange(!enabled)} className="condition-toggle"><div /></div>
        )}
      </li>
    );
  }
}

export class VariableConditionRow extends React.Component {
  static propTypes = {
    actor: PropTypes.object,
    character: PropTypes.object,
    enabled: PropTypes.bool,
    onChange: PropTypes.func,
    variableId: PropTypes.string,
    variableValue: PropTypes.number,
    comparator: PropTypes.string,
  };

  static defaultProps = {
    comparator: '=',
    enabled: false,
  }

  render() {
    const {actor, character, enabled, onChange, variableId, variableValue, comparator} = this.props;

    return (
      <li className={`enabled-${this.props.enabled}`}>
        <div className="left">
          <ActorBlock character={character} actor={actor} />
          variable
          <VariableBlock name={character.variables[variableId].name} />
          is
          {onChange ? (
            <select value={comparator} onChange={(e) => onChange(enabled, e.target.value)}>
              <option value="<=">&lt;=</option>
              <option value="=">=</option>
              <option value=">=">&gt;=</option>
            </select>
          ) : (
            ` ${comparator} `
          )}
          {variableValue}
        </div>
        {onChange && (
          <div onClick={() => onChange(!enabled, comparator)} className="condition-toggle"><div /></div>
        )}
      </li>
    );
  }
}