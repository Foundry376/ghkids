import React from 'react'; import PropTypes from 'prop-types';

export default class RuleStateCircle extends React.Component {
  static propTypes = {
    rule: PropTypes.object,
  };

  static contextTypes = {
    evaluatedRuleIdsForActor: PropTypes.object,
  }

  render() {
    const ids = this.context.evaluatedRuleIdsForActor;
    const applied = ids && ids[this.props.rule.id];
    return (
      <div className={`circle ${applied}`} />
    );
  }
}
