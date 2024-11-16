import React from 'react'; import PropTypes from 'prop-types';
import RuleStateCircle from './rule-state-circle';
import RuleList from './rule-list';
import DisclosureTriangle from './disclosure-triangle';

import {nameForKey} from '../../utils/event-helpers';

export default class ContentEventGroup extends React.Component {
  static propTypes = {
    rule: PropTypes.object,
    onClick: PropTypes.func,
  };

  static contextTypes = {
    onRulePickKey: PropTypes.func,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      collapsed: false,
    };
  }

  _name() {
    const {event, code} = this.props.rule;

    if (event === 'key') {
      return (
        <span>
          When the
          <span className="keycode">{nameForKey(code)} Key</span>
          is Pressed
        </span>
      );
    }
    if (event === 'click') {
      return "When I'm Clicked";
    }
    return "When I'm Idle";
  }

  render() {
    const {rule} = this.props;
    const {collapsed} = this.state;

    return (
      <div>
        <div className="header">
          <div style={{float:'left', width: 20, lineHeight:'1.15em'}}>
            <RuleStateCircle rule={rule} />
            <DisclosureTriangle
              onClick={() => this.setState({collapsed: !collapsed})}
              collapsed={collapsed}
            />
          </div>
          <img className="icon" src={new URL(`../../img/icon_event_${rule.event}.png`, import.meta.url).href} />
          <div
            className="name"
            onDoubleClick={() => this.context.onRulePickKey(rule.id)}
          >
            {this._name()}
          </div>
        </div>
      <RuleList
        parentId={rule.id}
        rules={rule.rules}
        collapsed={collapsed}
      />
    </div>
    );
  }
}
