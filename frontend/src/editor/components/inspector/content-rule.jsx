import PropTypes from 'prop-types';
import React from 'react';

import TapToEditLabel from "../tap-to-edit-label";
import DisclosureTriangle from "./disclosure-triangle";
import RuleStateCircle from "./rule-state-circle";
import ScenarioStage from "./scenario-stage";

import { toV2Condition } from "../../utils/stage-helpers";
import { FreeformConditionRow } from "../stage/recording/condition-rows";
import {
  isCollapsePersisted,
  persistCollapsedState,
} from "./collapse-state-storage";

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
      collapsed: isCollapsePersisted(props.rule.id),
    };
  }

  _onNameChange = (event) => {
    this.context.onRuleChanged(this.props.rule.id, {
      name: event.target.value,
    });
  };

  render() {
    const { characters } = this.context;
    const { rule } = this.props;
    const { collapsed } = this.state;

    const conditions = [];
    Object.values(rule.actors).forEach((a) => {
      const saved = rule.conditions[a.id] || {};

      Object.entries(saved).forEach(([key, value]) => {
        if (value && value.enabled) {
          conditions.push(
            <FreeformConditionRow
              key={`${a.id}-${key}`}
              actor={a}
              actors={rule.actors}
              condition={toV2Condition(key, value)}
              characters={characters}
            />
          );
        }
      });
    });

    return (
      <div>
        <div className="scenario">
          <RuleStateCircle rule={rule} />
          <div style={{ flex: 1 }} />
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
          <div style={{ flex: 1 }} />
        </div>
        <DisclosureTriangle
          onClick={() => {
            this.setState({ collapsed: !collapsed });
            persistCollapsedState(this.props.rule.id, !collapsed);
          }}
          enabled={conditions.length > 0}
          collapsed={conditions.length === 0 || collapsed}
        />
        <TapToEditLabel
          className="name"
          value={rule.name}
          onChange={this._onNameChange}
        />
        {conditions.length > 0 && !collapsed && (
          <ul className="conditions">{conditions}</ul>
        )}
      </div>
    );
  }
}
