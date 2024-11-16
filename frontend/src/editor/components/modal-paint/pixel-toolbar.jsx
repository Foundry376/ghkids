import React from 'react'; import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class PixelToolbar extends React.Component {
  static propTypes = {
    tools: PropTypes.array,
    tool: PropTypes.object,
    onToolChange: PropTypes.func,
  };

  render() {
    const {tool, tools, onToolChange} = this.props;

    return (
      <div className="tools" data-tutorial-id="paint-tools">
        {tools.map(t =>
          <button
            key={t.name}
            className={classNames({'tool': true, 'selected': tool === t})}
            onClick={() => onToolChange(t)}
          >
            <img src={new URL(`../../img/tool_${t.name}.png`, import.meta.url).href} />
          </button>
        )}
      </div>
    );
  }
}
