import React from 'react'; import PropTypes from 'prop-types';

const DELTA_SQUARE_SIZE = 10;

export default class SquaresCanvas extends React.Component {
  static propTypes = {
    onDraw: PropTypes.func,
    width: PropTypes.number,
    height: PropTypes.number,
  };

  componentDidMount() {
    this.props.onDraw(this._el, this._el.getContext('2d'), this._el.width / this.props.width);
  }

  componentDidUpdate() {
    this.props.onDraw(this._el, this._el.getContext('2d'), this._el.width / this.props.width);
  }

  render() {
    const {width, height} = this.props;
    const scale = Math.min(DELTA_SQUARE_SIZE, 40.0 / height);
    return (
      <canvas
        ref={(el) => this._el = el}
        width={width * scale * window.devicePixelRatio}
        height={height * scale * window.devicePixelRatio}
        className="delta-canvas"
        style={{width: width * scale, height: height * scale}}
      />
    );
  }
}