import SquaresCanvas from './squares-canvas';
import React from 'react'; import PropTypes from 'prop-types';

export default class ActorPositionCanvas extends React.Component {
  static propTypes = {
    extent: PropTypes.object,
    position: PropTypes.object,
  }

  _draw = (el, c, squareSize) => {
    const {position, extent} = this.props;
    c.fillStyle = '#fff';
    c.fillRect(0, 0, el.width, el.height);
    c.fillStyle = '#f00';
    c.fillRect((position.x - extent.xmin) * squareSize, (position.y - extent.ymin) * squareSize, squareSize, squareSize);

    c.lineWidth = 1;
    c.strokeStyle = 'rgba(0,0,0,0.4)';
    c.strokeRect(0, 0, el.width, el.height);
  }

  render() {
    const {extent} = this.props;
    return (
      <SquaresCanvas
        width={(extent.xmax - extent.xmin + 1)}
        height={(extent.ymax - extent.ymin + 1)}
        onDraw={this._draw}
      />
    );
  }
}