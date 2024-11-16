import React from 'react'; import PropTypes from 'prop-types';
import {STAGE_CELL_SIZE} from '../../constants/constants';

export default class RecordingIgnoredSprite extends React.Component {
  static propTypes = {
    x: PropTypes.number,
    y: PropTypes.number,
  };

  render() {
    return (
      <div style={{
        position: 'absolute',
        pointerEvents: 'none',
        background: `url('/src/editor/img/ignored_square.png') top left no-repeat`,
        width: STAGE_CELL_SIZE,
        height: STAGE_CELL_SIZE,
        left: this.props.x * STAGE_CELL_SIZE,
        top: this.props.y * STAGE_CELL_SIZE,
      }} />
    );
  }
}