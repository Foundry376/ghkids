import React from 'react'; import PropTypes from 'prop-types';

import ContentRule from './content-rule';
import ContentEventGroup from './content-event-group';
import ContentFlowGroup from './content-flow-group';

import {TOOL_TRASH} from '../../constants/constants';
import {CONTAINER_TYPES} from '../../utils/world-constants';

const DROP_INDEX_NA = 1000;
const DROP_INDEX_INSIDE_BUT_INDETERMINATE = -1;

class RuleDropPlaceholder extends React.Component {
  render() {
    return (<div style={{height: 30}} />);
  }
}

export default class RuleList extends React.Component {
  static propTypes = {
    parentId: PropTypes.string,
    rules: PropTypes.array,
    collapsed: PropTypes.bool,
  };

  static contextTypes = {
    onRuleMoved: PropTypes.func,
    onRuleDeleted: PropTypes.func,
    onRulePickKey: PropTypes.func,
    onRuleReRecord: PropTypes.func,
    selectedToolId: PropTypes.string,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      dragIndex: -1,
      dropIndex: -1,
      hovering: false,
    };
  }

  componentWillReceiveProps() {
    if (this.state.dragIndex !== -1) {
      this.setState({dragIndex: -1, dropIndex: -1});
    }
  }

  componentWillUnmount() {
    clearTimeout(this._leaveTimeout);
  }

  _contentForRule(rule) {
    if (rule.type === CONTAINER_TYPES.EVENT) {
      return ContentEventGroup;
    }
    if (rule.type === CONTAINER_TYPES.FLOW) {
      return ContentFlowGroup;
    }
    return ContentRule;
  }

  _dropIndexForRuleDragEvent(event) {
    const hasRuleId = event.dataTransfer.types.includes('rule-id');
    if (!hasRuleId) {
      return DROP_INDEX_NA;
    }

    const all = Array.from(this._el.children).filter(c => c.classList.contains('rule-container'));
    for (let i = 0; i < all.length; i ++) {
      const {top, height} = all[i].getBoundingClientRect();
      if (event.clientY < top + Math.min(50, height * 0.33)) {
        return i;
      }

      // create a dead zone within the item. This is crucial for the drop-zones
      // within the item (ala nested rule list).
      if (event.clientY < top + Math.max(height - 50, height * 0.66)) {
        return DROP_INDEX_INSIDE_BUT_INDETERMINATE;
      }
    }

    return all.length;
  }

  _onRuleClicked = (event, rule) => {
    event.stopPropagation();
    if (this.context.selectedToolId === TOOL_TRASH) {
      this.context.onRuleDeleted(rule.id, event);
    }
  }

  _onRuleDoubleClick = (event, rule) => {
    event.stopPropagation();
    if (rule.type === CONTAINER_TYPES.EVENT || rule.type === CONTAINER_TYPES.FLOW) {
      return;
    }
    this.context.onRuleReRecord(rule);
  }

  _onDragStart = (event, rule) => {
    event.stopPropagation();
    event.dataTransfer.setData('rule-id', rule.id);
    this.setState({
      dragIndex: this.props.rules.indexOf(rule),
      dropIndex: -1,
    });
  }

  _onDragEnd = () => {
    this.setState({
      dragIndex: -1,
      dropIndex: -1,
    });
  }

  _onDragOver = (event) => {
    clearTimeout(this._leaveTimeout);

    const dropIndex = this._dropIndexForRuleDragEvent(event);
    if (dropIndex === DROP_INDEX_NA) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    if (dropIndex !== this.state.dropIndex) {
      this.setState({dropIndex});
    }
  }

  _onDragLeave = () => {
    this._leaveTimeout = setTimeout(() => {
      if (this.state.dropIndex !== -1) {
        this.setState({dropIndex: -1});
      }
    }, 1);
  }

  _onDrop = (event) => {
    const ruleId = event.dataTransfer.getData('rule-id');
    const dropIndex = this._dropIndexForRuleDragEvent(event);

    event.stopPropagation();
    event.preventDefault();

    if (!ruleId || (dropIndex === -1)) {
      return;
    }

    this.context.onRuleMoved(ruleId, this.props.parentId, dropIndex);
    this.setState({dragIndex: -1, dropIndex: -1});
  }

  _onMouseOver = (event, rule) => {
    event.stopPropagation();
    this.setState({hovering: rule.id});

  }

  _onMouseOut = (event) => {
    event.stopPropagation();
    if (this.state.hovering) {
      this.setState({hovering: false});
    }
  }

  render() {
    const {collapsed, rules} = this.props;
    const {dropIndex, dragIndex, hovering} = this.state;

    if (collapsed || !rules) {
      return <span />;
    }

    const items = rules.map((r) => {
      const ContentComponent = this._contentForRule(r);
      return (
        <li
          draggable
          key={r.id}
          data-rule-id={r.id}
          className={`rule-container ${r.type} ${(hovering === r.id) && 'hovering'}`}
          onClick={(event) => this._onRuleClicked(event, r)}
          onDoubleClick={(event) => this._onRuleDoubleClick(event, r)}
          onDragStart={(event) => this._onDragStart(event, r)}
          onDragEnd={(event) => this._onDragEnd(event, r)}
          onMouseOver={(event) => this._onMouseOver(event, r)}
          onMouseOut={(event) => this._onMouseOut(event, r)}
        >
          <ContentComponent rule={r} />
        </li>
      );
    });

    if ((dropIndex !== -1) && ((items.length === 0) || (dragIndex !== dropIndex))) {
      items.splice(dropIndex, 0, <RuleDropPlaceholder key={'drop'} />);
    }

    return (
      <ul
        className="rules-list"
        ref={(el) => this._el = el}
        onDragOver={this._onDragOver}
        onDragLeave={this._onDragLeave}
        onDrop={this._onDrop}
      >
        {items}
      </ul>
    );
  }
}
