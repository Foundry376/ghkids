import React, {PropTypes} from 'react';

export default class PageMessage extends React.Component {
  static propTypes = {
    text: PropTypes.string,
    size: PropTypes.string,
  };

  constructor(props, context) {
    super(props, context);
  }

  render() {
    return (
      <div className={`page-message ${this.props.size}`}>
        {this.props.text}
      </div>
    );
  }
}
