import React from 'react'; import PropTypes from 'prop-types';

export default class DisclosureTriangle extends React.Component {
  static propTypes = {
    collapsed: PropTypes.bool,
    onClick: PropTypes.func,
    enabled: PropTypes.bool,
  };

  static defaultProps = {
    enabled: true,
  };

  _onClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    this.props.onClick(e);
  }

  render() {
    return (
      <div
        onClick={this._onClick}
        className={`triangle ${this.props.collapsed ? 'disclosed': ''} ${this.props.enabled ? 'enabled': ''}`}
      />
    );
  }
}
