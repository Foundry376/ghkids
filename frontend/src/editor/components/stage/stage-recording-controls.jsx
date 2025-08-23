import PropTypes from "prop-types";
import React from "react";

import Button from "reactstrap/lib/Button";
import { cancelRecording, finishRecording } from "../../actions/recording-actions";
import { RECORDING_PHASE } from "../../constants/constants";

export default class StageRecordingControls extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    recording: PropTypes.object,
    characters: PropTypes.object,
  };

  constructor(props, context) {
    super(props, context);
  }

  _onCancel = () => {
    this.props.dispatch(cancelRecording());
  };

  _onNext = () => {
    const { dispatch, recording, characters } = this.props;

    if (recording.phase === RECORDING_PHASE.RECORD) {
      dispatch(finishRecording());
    }
  };

  render() {
    const {
      characters,
      recording: { characterId, phase },
    } = this.props;

    const message = {
      [RECORDING_PHASE.RECORD]:
        "Use the handles to expand the frame and act out what you want to happen in the picture on the right.",
    }[phase];

    const next = {
      [RECORDING_PHASE.RECORD]: (
        <span>
          <i className="fa fa-checkmark" />{" "}
          {this.props.recording.actions ? "Save Recording" : "Save Conditions"}
        </span>
      ),
    }[phase];

    return (
      <div className="stage-controls">
        <div className="left message">{message}</div>
        <div style={{ flex: 1 }} />
        <div className="right">
          <Button onClick={this._onCancel}>Cancel</Button>{" "}
          <Button data-tutorial-id="record-next-step" color="success" onClick={this._onNext}>
            {next}
          </Button>{" "}
        </div>
      </div>
    );
  }
}
