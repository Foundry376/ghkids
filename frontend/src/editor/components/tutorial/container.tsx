import React from "react";
import { connect, ConnectedProps } from "react-redux";
import Button from "reactstrap/lib/Button";

import { updateTutorialState } from "../../actions/ui-actions";
import { getCurrentStage } from "../../utils/selectors";
import { TutorialStep, tutorialSteps } from "../../constants/tutorial";

import TutorialAnnotation from "./annotation";
import Girl from "./girl";
import { EditorState, Stage } from "../../../types";

interface WaitsFor {
  button?: string;
  elementMatching?: string;
  stateMatching?: (state: EditorState, stage: Stage) => boolean | undefined;
  delay?: number;
}

class TutorialAdvancer {
  private _waitsFor: WaitsFor;
  private _callback: () => void;
  private _timer: ReturnType<typeof setTimeout> | undefined;
  private _unsub: (() => void) | undefined;

  constructor(step: TutorialStep, callback: () => void) {
    this._waitsFor = step.waitsFor || {};
    this._callback = callback;

    if (step.onEnter) {
      step.onEnter(window.editorStore!.dispatch);
    }

    if (this._waitsFor.stateMatching) {
      const tryState = () => {
        const state = window.editorStore!.getState() as EditorState;
        const currentStage = getCurrentStage(state);
        if (currentStage && this._waitsFor.stateMatching?.(state, currentStage)) {
          this._timer = setTimeout(this._callback, this._waitsFor.delay || 750);
          this._unsub?.();
        }
      };
      this._unsub = window.editorStore!.subscribe(tryState);
      tryState();
    }

    if (this._waitsFor.elementMatching) {
      const tryElements = () => {
        if (document.querySelector(this._waitsFor.elementMatching!)) {
          this._timer = setTimeout(this._callback, this._waitsFor.delay || 250);
          this._unsub?.();
        }
      };
      const interval = setInterval(tryElements, 500);
      this._unsub = () => clearInterval(interval);
      tryElements();
    }
  }

  onAudioEnded(): void {
    if (this._waitsFor.stateMatching || this._waitsFor.elementMatching || this._waitsFor.button) {
      return;
    }
    this._callback();
  }

  detach(): void {
    clearTimeout(this._timer);
    if (this._unsub) {
      this._unsub();
    }
  }
}

type StepSetKey = keyof typeof tutorialSteps;

interface TutorialContainerState {
  playing: boolean;
}

const mapStateToProps = (state: EditorState) => state.ui.tutorial;

const connector = connect(mapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

class TutorialContainer extends React.Component<PropsFromRedux, TutorialContainerState> {
  private _audio: HTMLAudioElement | null = null;
  private _advancer: TutorialAdvancer | null = null;

  constructor(props: PropsFromRedux) {
    super(props);
    this.state = {
      playing: false,
    };
  }

  componentDidMount(): void {
    this._startCurrentStep();

    const pageQueryParams = location.search.split(/[?&]/g).map((p) => p.split("="));
    const pageQueryStepSet = (pageQueryParams.find((p) => p[0] === "tutorial") || [])[1] as
      | StepSetKey
      | undefined;

    if (pageQueryStepSet && !this.props.stepSet) {
      this.props.dispatch(
        updateTutorialState({
          stepSet: pageQueryStepSet,
          stepIndex: 0,
        }),
      );
    }
  }

  componentDidUpdate(prevProps: PropsFromRedux): void {
    if (prevProps.stepIndex !== this.props.stepIndex) {
      this._startCurrentStep();
    }
  }

  componentWillUnmount(): void {
    this._detatchForCurrentStep();
  }

  private _detatchForCurrentStep(): void {
    if (this._audio) {
      this._audio.pause();
      this._audio = null;
    }
    if (this._advancer) {
      this._advancer.detach();
      this._advancer = null;
    }
  }

  private _startCurrentStep(): void {
    this._detatchForCurrentStep();

    const { stepSet, stepIndex } = this.props;
    if (!stepSet) {
      return;
    }

    const step = tutorialSteps[stepSet][stepIndex];
    if (!step) {
      return;
    }

    this._advancer = new TutorialAdvancer(step, () => {
      this._onNextStep();
    });

    if (step.soundURL) {
      this._audio = new Audio(step.soundURL);
      this._audio.addEventListener("playing", () => {
        if (this.props.stepIndex !== stepIndex || !this._audio) {
          return;
        }
        this.setState({ playing: true });
      });
      this._audio.addEventListener("pause", () => {
        if (this.props.stepIndex !== stepIndex || !this._audio) {
          return;
        }
        this.setState({ playing: false });
      });
      this._audio.addEventListener("ended", () => {
        if (this.props.stepIndex !== stepIndex || !this._audio) {
          return;
        }
        this.setState({ playing: false });
        this._advancer?.onAudioEnded();
      });
      this._audio.play().catch(() => {
        // Ignore AbortError when play() is interrupted by pause()
      });
    }
  }

  private _onNextStep = (): void => {
    const { dispatch, stepIndex } = this.props;
    dispatch(updateTutorialState({ stepIndex: stepIndex + 1 }));
  };

  private _onPrevStep = (): void => {
    const { dispatch, stepIndex } = this.props;
    if (stepIndex > 0) {
      dispatch(updateTutorialState({ stepIndex: stepIndex - 1 }));
    }
  };

  render(): React.ReactNode {
    const { stepSet, stepIndex } = this.props;
    const { playing } = this.state;
    const step = stepSet && tutorialSteps[stepSet][stepIndex];

    if (!step) {
      return <div />;
    }

    return (
      <div>
        <div className="tutorial-container">
          <Girl pose={step.pose} playing={playing} />
          <div className="tutorial-flex">
            <div className="copy">
              {step.text}
              <br />
            </div>
            <div className="controls">
              {step.waitsFor && step.waitsFor.button ? (
                <Button size="sm" color="primary" onClick={this._onNextStep}>
                  {step.waitsFor.button}
                </Button>
              ) : (
                <div className="playback">
                  <i className="fa fa-step-backward" onClick={this._onPrevStep} />
                  <i
                    className={`fa ${playing ? "fa-pause" : "fa-play"}`}
                    onClick={() =>
                      this._audio &&
                      (playing
                        ? this._audio.pause()
                        : this._audio.play().catch(() => {
                            // Ignore AbortError when play() is interrupted by pause()
                          }))
                    }
                  />
                  <i className="fa fa-step-forward" onClick={this._onNextStep} />
                </div>
              )}
            </div>
          </div>
        </div>

        <TutorialAnnotation {...step.annotation} />
      </div>
    );
  }
}

const ConnectedTutorialContainer = connector(TutorialContainer);
export default ConnectedTutorialContainer;
