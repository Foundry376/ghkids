import React, {PropTypes} from 'react';
import {STAGE_CELL_SIZE} from '../../constants/constants';

export default class RecordingMaskSprite extends React.Component {
  static propTypes = {
    xmin: PropTypes.number,
    xmax: PropTypes.number,
    ymin: PropTypes.number,
    ymax: PropTypes.number,
  };

  render() {
    return (
      <div style={{
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: (this.props.xmax - this.props.xmin) * STAGE_CELL_SIZE,
        height: (this.props.ymax - this.props.ymin) * STAGE_CELL_SIZE,
        left: this.props.xmin * STAGE_CELL_SIZE,
        top: this.props.ymin * STAGE_CELL_SIZE,
      }} />
    );
  }
}