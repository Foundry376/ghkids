import React, {PropTypes} from 'react';

import '../../styles/girl.scss';
import {poseFrames} from '../../constants/tutorial';

export default class Girl extends React.Component {
  static propTypes = {
    pose: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
    playing: PropTypes.bool,
  }

  constructor(props, context) {
    super(props, context);
    this.state = {
      frameIndex: 0,
    };
  }

  componentDidMount() {
    if (this.props.playing) {
      this.startTimer();
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.pose !== this.props.pose) {
      this.setState({frameIndex: 0});
    }
    if (nextProps.playing && !this.props.playing) {
      this.startTimer();
    }
    if (!nextProps.playing && this.props.playing) {
      this.setState({frameIndex: 0});
      this.stopTimer();
    }
  }

  componentWillUnmount() {
    this.stopTimer();
  }

  _flattenedFrames() {
    if (this.props.pose instanceof Array) {
      return [].concat(...(this.props.pose.map(key => poseFrames[key])));
    }
    return poseFrames[this.props.pose];
  }

  startTimer() {
    this._timer = setInterval(() => {
      const frameCount = this._flattenedFrames().length;
      this.setState({frameIndex: (this.state.frameIndex + 1) % frameCount});
    }, 1000);
  }

  stopTimer() {
    clearTimeout(this._timer);
    this._timer = null;
  }

  render() {
    return (
      <div className="girl-container">
        <div className={`girl girl-${this._flattenedFrames()[this.state.frameIndex]}`} />
      </div>
    );
  }
}
