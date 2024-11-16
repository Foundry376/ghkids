import React, {PropTypes} from 'react';
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
        background: `url(${require('../../img/ignored_square.png')}) top left no-repeat`,
        width: STAGE_CELL_SIZE,
        height: STAGE_CELL_SIZE,
        left: this.props.x * STAGE_CELL_SIZE,
        top: this.props.y * STAGE_CELL_SIZE,
      }} />
    );
  }
}