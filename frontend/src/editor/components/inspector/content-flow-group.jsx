import PropTypes from "prop-types";
import React from "react";
import TapToEditLabel from "../tap-to-edit-label";
import DisclosureTriangle from "./disclosure-triangle";
import RuleList from "./rule-list";
import RuleStateCircle from "./rule-state-circle";

import { FLOW_BEHAVIORS } from "../../utils/world-constants";
import { isCollapsePersisted, persistCollapsedState } from "./collapse-state-storage";

export default class ContentGroupFlow extends React.Component {
  static propTypes = {
    rule: PropTypes.object,
    onClick: PropTypes.func,
  };

  static contextTypes = {
    onRuleChanged: PropTypes.func,
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

  _onBehaviorChanged = (event) => {
    this.context.onRuleChanged(this.props.rule.id, {
      behavior: event.target.value,
    });
  };

  render() {
    const { rule } = this.props;
    const { collapsed } = this.state;

    return (
      <div>
        <div className="header">
          <div style={{ float: "left", width: 20 }}>
            <RuleStateCircle rule={rule} />
            <DisclosureTriangle
              onClick={() => {
                this.setState({ collapsed: !collapsed });
                persistCollapsedState(this.props.rule.id, !collapsed);
              }}
              collapsed={collapsed}
            />
          </div>
          <select onChange={this._onBehaviorChanged} value={rule.behavior}>
            <option key={FLOW_BEHAVIORS.FIRST} value={FLOW_BEHAVIORS.FIRST}>
              Do First Match
            </option>
            <option key={FLOW_BEHAVIORS.ALL} value={FLOW_BEHAVIORS.ALL}>
              Do All &amp; Continue
            </option>
            <option key={FLOW_BEHAVIORS.RANDOM} value={FLOW_BEHAVIORS.RANDOM}>
              Randomize &amp; Do First
            </option>
          </select>
          <TapToEditLabel className="name" value={rule.name} onChange={this._onNameChange} />
        </div>
        <RuleList parentId={rule.id} rules={rule.rules} collapsed={collapsed} />
      </div>
    );
  }
}
