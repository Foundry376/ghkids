import React from "react";
import { connect, ConnectedProps } from "react-redux";
import { Button } from "reactstrap";

import { updateTutorialState } from "../../actions/ui-actions";
import { TutorialStep, walkthroughSteps } from "../../constants/tutorial";
import { getCurrentStage } from "../../utils/selectors";

import { EditorState, Stage } from "../../../types";
import { Lesson, lessonAfter, lessonForSlug } from "../../../lessons/lessons";
import { startLesson } from "../../../lessons/start-lesson";
import TutorialAnnotation from "./annotation";
import Girl from "./girl";

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

interface TutorialContainerState {
  playing: boolean;
  /** The kid has clicked past the lesson's title card. */
  started: boolean;
  /** They've dismissed the "lesson finished" card to keep building. */
  dismissedFinish: boolean;
  startingNextLesson: boolean;
}

const mapStateToProps = (state: EditorState) => state.ui.tutorial;

const connector = connect(mapStateToProps);

type PropsFromRedux = ConnectedProps<typeof connector>;

/**
 * Runs the walkthrough for whatever the editor was opened with: a lesson
 * (`/editor/123?lesson=record-a-rule`) or the tour a kid gets after forking
 * someone else's game (`?tutorial=fork`).
 *
 * A lesson is bookended by two cards this component renders itself - a title
 * card that also gives the browser the click it wants before playing audio, and
 * a finish card that leads into the next lesson - so lesson content is only the
 * steps in between.
 */
class TutorialContainer extends React.Component<PropsFromRedux, TutorialContainerState> {
  private _audio: HTMLAudioElement | null = null;
  private _advancer: TutorialAdvancer | null = null;

  constructor(props: PropsFromRedux) {
    super(props);
    this.state = {
      playing: false,
      started: false,
      dismissedFinish: false,
      startingNextLesson: false,
    };
  }

  componentDidMount(): void {
    const params = new URLSearchParams(location.search);
    const stepSet = params.get("lesson") || params.get("tutorial");

    if (stepSet && !this.props.stepSet) {
      this.props.dispatch(updateTutorialState({ stepSet, stepIndex: 0 }));
    }
    if (this._lesson()) {
      return; // waits for the kid to click through the title card
    }
    this.setState({ started: true });
    this._startCurrentStep();
  }

  componentDidUpdate(prevProps: PropsFromRedux): void {
    if (prevProps.stepIndex !== this.props.stepIndex && this.state.started) {
      this._startCurrentStep();
    }
  }

  componentWillUnmount(): void {
    this._detatchForCurrentStep();
  }

  private _lesson(): Lesson | undefined {
    const params = new URLSearchParams(location.search);
    return lessonForSlug(this.props.stepSet || params.get("lesson"));
  }

  private _steps(): TutorialStep[] | undefined {
    const params = new URLSearchParams(location.search);
    const stepSet = this.props.stepSet || params.get("lesson") || params.get("tutorial");
    return stepSet ? walkthroughSteps[stepSet] : undefined;
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

    const { stepIndex } = this.props;
    const step = this._steps()?.[stepIndex];
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

  private _onStartLesson = (): void => {
    this.setState({ started: true }, () => this._startCurrentStep());
  };

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

  private _onStartNextLesson = (next: Lesson): void => {
    this.setState({ startingNextLesson: true });
    startLesson(next).catch(() => {
      this.setState({ startingNextLesson: false });
    });
  };

  private _renderCard(children: React.ReactNode, pose: React.ComponentProps<typeof Girl>["pose"]) {
    return (
      <div className="tutorial-container">
        <Girl pose={pose} playing={false} />
        <div className="tutorial-flex">{children}</div>
      </div>
    );
  }

  render(): React.ReactNode {
    const { stepIndex } = this.props;
    const { playing, started, dismissedFinish, startingNextLesson } = this.state;
    const steps = this._steps();
    const lesson = this._lesson();

    if (!steps) {
      return <div />;
    }

    if (lesson && !started) {
      return this._renderCard(
        <>
          <div className="copy">
            <strong>{lesson.title}</strong>
            <br />
            {lesson.caption}
          </div>
          <div className="controls">
            <Button size="sm" color="primary" onClick={this._onStartLesson}>
              {stepIndex > 0 ? "Keep Going" : "Start Lesson"}
            </Button>
          </div>
        </>,
        "sitting-talking",
      );
    }

    const step = steps[stepIndex];

    if (!step) {
      if (!lesson || dismissedFinish) {
        return <div />;
      }
      const next = lessonAfter(lesson.slug);
      return this._renderCard(
        <>
          <div className="copy">
            <strong>You finished {lesson.title}!</strong>
            <br />
            {next
              ? `Next up: ${next.title} - ${next.caption}`
              : `That's the last lesson. Keep going on your own, or start a game of your own from the menu.`}
          </div>
          <div className="controls">
            {next && (
              <Button
                size="sm"
                color="primary"
                disabled={startingNextLesson}
                onClick={() => this._onStartNextLesson(next)}
              >
                {startingNextLesson ? "Starting…" : `Start ${next.title}`}
              </Button>
            )}{" "}
            <Button size="sm" color="secondary" onClick={() => (window.location.href = "/learn")}>
              All Lessons
            </Button>{" "}
            <Button size="sm" color="link" onClick={() => this.setState({ dismissedFinish: true })}>
              Keep Building
            </Button>
          </div>
        </>,
        "excited",
      );
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
