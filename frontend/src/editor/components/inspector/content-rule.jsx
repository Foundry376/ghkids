import React from 'react'; import PropTypes from 'prop-types';

import ScenarioStage from './scenario-stage';
import RuleStateCircle from './rule-state-circle';
import DisclosureTriangle from './disclosure-triangle';
import TapToEditLabel from '../tap-to-edit-label';

import {TransformConditionRow, AppearanceConditionRow, VariableConditionRow} from '../stage/recording/condition-rows';

export default class ContentRule extends React.Component {
  static propTypes = {
    rule: PropTypes.object,
  };

  static contextTypes = {
    onRuleChanged: PropTypes.func,
    characters: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      collapsed: false,
    };
  }

  _onNameChange = (event) => {
    this.context.onRuleChanged(this.props.rule.id, {name: event.target.value});
  }

  render() {
    const {characters} = this.context;
    const {rule} = this.props;
    const {collapsed} = this.state;

    const conditions = [];
    Object.values(rule.actors).forEach((a) => {
      const saved = rule.conditions[a.id] || {};

      if (saved['transform'] && saved['transform'].enabled) {
        conditions.push(
          <TransformConditionRow
            key={`${a.id}-transform`}
            character={characters[a.characterId]}
            actor={a}
            transform={a.transform}
            enabled
          />
        );
      }

      if (saved['appearance'] && saved['appearance'].enabled) {
        conditions.push(
          <AppearanceConditionRow
            key={`${a.id}-appearance`}
            character={characters[a.characterId]}
            actor={a}
            appearance={a.appearance}
            enabled
          />
        );
      }

      for (const vkey of Object.keys(a.variableValues)) {
        if (saved[vkey] && saved[vkey].enabled) {
          conditions.push(
            <VariableConditionRow
              key={`${a.id}-var-${vkey}`}
              character={characters[a.characterId]}
              actor={a}
              variableId={vkey}
              variableValue={a.variableValues[vkey]}
              {...saved[vkey]}
            />
          );
        }
      }
    });

    return (
      <div>
        <div className="scenario">
          <RuleStateCircle rule={rule} />
          <div style={{flex: 1}} />
          <ScenarioStage
            rule={rule}
            applyActions={false}
            maxWidth={75}
            maxHeight={75}
          />
          <i className="fa fa-arrow-right" aria-hidden="true" />
          <ScenarioStage
            rule={rule}
            applyActions
            maxWidth={75}
            maxHeight={75}
          />
          <div style={{flex: 1}} />
        </div>
        <DisclosureTriangle
          onClick={() => this.setState({collapsed: !collapsed})}
          enabled={conditions.length > 0}
          collapsed={conditions.length === 0 || collapsed}
        />
        <TapToEditLabel
          className="name"
          value={rule.name}
          onChange={this._onNameChange}
        />
        {conditions.length > 0 && !collapsed && (
          <ul className="conditions">
            {conditions}
          </ul>
        )}
      </div>
    );
  }
}
