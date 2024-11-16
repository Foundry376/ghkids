/* eslint react/no-danger: 0 */
import React from 'react'; import PropTypes from 'prop-types';

export default class TapToEditLabel extends React.Component {
  static propTypes = {
    value: PropTypes.string,
    className: PropTypes.string,
    onChange: PropTypes.func,
  };

  constructor(props) {
    super(props);
    this.state = {
      editing: false,
    };
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.editing === false && this.state.editing === true) {
      this._el.focus();
      document.execCommand('selectAll', false, null);
    }
  }

  render() {
    const {value, onChange, className} = this.props;
    const {editing} = this.state;
    
    if (!onChange) {
      return (
        <div
          ref={(el) => this._el = el}
          className={`tap-to-edit editing-false ${className}`}
          dangerouslySetInnerHTML={{__html: value}}
        />
      );
    }

    return (
      <div
        contentEditable={editing}
        ref={(el) => this._el = el}
        className={`tap-to-edit editing-${editing} enabled ${className}`}
        dangerouslySetInnerHTML={{__html: value}}
        onChange={(e) => {
          onChange({target: {value: e.target.innerText}});
        }}
        onDragStart={(e) => {
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (!editing) {
            this.setState({editing: true});
            e.preventDefault();
          }
        }}  
        onKeyUp={(e) => {
          if (e.keyCode === 13) {
            e.target.blur();            
          }
        }}
        onBlur={(e) => {
          this.setState({editing: false});
          onChange({target: {value: e.target.innerText}});
        }}
      />
    );

  }
}
