import SquaresCanvas from './squares-canvas';
import React from 'react'; import PropTypes from 'prop-types';

export default class ActorDeltaCanvas extends React.Component {
  static propTypes = {
    delta: PropTypes.object,
  }

  _draw = (el, c, squareSize) => {
    const {x: dx, y: dy} = this.props.delta;
    let [sx, sy] = [0, 0];

    if (dx < 0) { sx = Math.abs(dx); }
    if (dy < 0) { sy = Math.abs(dy); }

    c.fillStyle = '#fff';
    c.fillRect(0, 0, el.width, el.height);
    c.fillStyle = '#ccc';
    c.fillRect(sx * squareSize, sy * squareSize, squareSize, squareSize);
    c.fillStyle = '#f00';
    c.fillRect((sx + dx) * squareSize, (sy + dy) * squareSize, squareSize, squareSize);

    c.lineWidth = 1;
    c.strokeStyle = 'rgba(0,0,0,0.4)';
    c.strokeRect(0, 0, el.width, el.height);
  }

  render() {
    const {x: dx, y: dy} = this.props.delta;
    const [width, height] = [(Math.abs(dx) + 1), (Math.abs(dy) + 1)];
    return (
      <SquaresCanvas width={width} height={height} onDraw={this._draw} />
    );
  }
}