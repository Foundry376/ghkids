import React, {PropTypes} from 'react';
import {connect} from 'react-redux';
import Stage from './stage';
import StageControls from './stage-controls';
import StageRecordingTools from './stage-recording-tools';
import StageRecordingControls from './stage-recording-controls';
import RecordingActions from './recording/panel-actions';
import RecordingConditions from './recording/panel-conditions';

import {RECORDING_PHASE_SETUP, RECORDING_PHASE_RECORD} from '../../constants/constants';
import {getCurrentStageForWorld} from '../../utils/selectors';


class StageContainer extends React.Component {
  static propTypes = {
    readonly: PropTypes.bool,

    world: PropTypes.object,
    characters: PropTypes.object,
    recording: PropTypes.object,
    playback: PropTypes.object,
    dispatch: PropTypes.func,
  };

  render() {
    const {world, recording, playback, dispatch, characters, readonly} = this.props;

    let stageA = null;
    let stageB = null;
    let actions = null;
    let controls = null;

    if (recording.characterId) {
      controls = (
        <StageRecordingControls
          characters={characters}
          dispatch={dispatch}
          recording={recording}
        />
      );

      if (recording.phase === RECORDING_PHASE_SETUP) {
        stageA = (
          <Stage
            world={recording.beforeWorld}
            stage={getCurrentStageForWorld(recording.beforeWorld)}
            recordingExtent={recording.extent}
          />
        );
      } else if (recording.phase === RECORDING_PHASE_RECORD) {
        stageA = (
          <Stage
            style={{marginRight: 2}}
            world={recording.beforeWorld}
            stage={getCurrentStageForWorld(recording.beforeWorld)}
            recordingExtent={recording.extent}
            recordingCentered
          />
        );
        stageB = (
          <Stage
            style={{marginLeft: 2}}
            world={recording.afterWorld}
            stage={getCurrentStageForWorld(recording.afterWorld)}
            recordingExtent={recording.extent}
            recordingCentered
          />
        );
        actions = (
          <div className="recording-specifics">
            <div style={{position: "absolute", transform:'translate(0, -100%)', paddingBottom: 5}}>
              <StageRecordingTools />
            </div>
            <RecordingConditions
              characters={characters}
              recording={recording}
              dispatch={dispatch}
            />
            <RecordingActions
              characters={characters}
              recording={recording}
              dispatch={dispatch}
            />
          </div>
        );
      }
    }

    return ( 
      <div className="panel stages">
        <div className="stages-horizontal-flex">
          {stageA || <Stage world={world} stage={getCurrentStageForWorld(world)} recording={null} readonly={readonly} />}
          {stageB || <Stage style={{flex: 0}} />}
        </div>
        {actions || <div className="recording-specifics" style={{height: 0}} />}
        {controls || <StageControls {...playback} dispatch={dispatch} world={world} readonly={readonly} />}
      </div>
    );
  }
}

function mapStateToProps(state) {
  return Object.assign({}, {
    recording: state.recording,
    characters: state.characters,
    playback: state.ui.playback,
    world: state.world,
  });
}

export default connect(
  mapStateToProps,
)(StageContainer);
