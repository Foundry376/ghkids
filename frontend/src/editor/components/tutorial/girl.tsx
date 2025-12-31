import React from "react";

import { poseFrames } from "../../constants/tutorial";
import "../../styles/girl.scss";

type PoseKey = keyof typeof poseFrames;

interface GirlProps {
  pose?: PoseKey | PoseKey[];
  playing?: boolean;
}

interface GirlState {
  frameIndex: number;
}

export default class Girl extends React.Component<GirlProps, GirlState> {
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor(props: GirlProps) {
    super(props);
    this.state = {
      frameIndex: 0,
    };
  }

  componentDidMount(): void {
    if (this.props.playing) {
      this.startTimer();
    }
  }

  UNSAFE_componentWillReceiveProps(nextProps: GirlProps): void {
    if (nextProps.pose !== this.props.pose) {
      this.setState({ frameIndex: 0 });
    }
    if (nextProps.playing && !this.props.playing) {
      this.startTimer();
    }
    if (!nextProps.playing && this.props.playing) {
      this.setState({ frameIndex: 0 });
      this.stopTimer();
    }
  }

  componentWillUnmount(): void {
    this.stopTimer();
  }

  private _flattenedFrames(): string[] {
    const { pose } = this.props;
    if (Array.isArray(pose)) {
      return ([] as string[]).concat(...pose.map((key) => poseFrames[key]));
    }
    return (pose && poseFrames[pose]) ?? [];
  }

  startTimer(): void {
    this._timer = setInterval(() => {
      const frameCount = this._flattenedFrames().length;
      this.setState({ frameIndex: (this.state.frameIndex + 1) % frameCount });
    }, 1000);
  }

  stopTimer(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  render(): React.ReactNode {
    return (
      <div className="girl-container">
        <div className={`girl girl-${this._flattenedFrames()[this.state.frameIndex]}`} />
      </div>
    );
  }
}
