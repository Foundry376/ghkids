import React from 'react'; import PropTypes from 'prop-types';
import classNames from 'classnames';

import Button from 'reactstrap/lib/Button';
import ButtonGroup from 'reactstrap/lib/ButtonGroup';
import {updatePlaybackState} from '../../actions/ui-actions';
import {getStageScreenshot} from '../../utils/stage-helpers';
import {getCurrentStageForWorld} from '../../utils/selectors';
import {advanceGameState, stepBackGameState, saveInitialGameState, restoreInitialGameState} from '../../actions/stage-actions';
import {SPEED_OPTIONS} from '../../constants/constants';


export default class StageControls extends React.Component {
  static propTypes = {
    readonly: PropTypes.bool,

    world: PropTypes.object,
    dispatch: PropTypes.func,
    speed: PropTypes.number,
    running: PropTypes.bool,
  };

  constructor(props, context) {
    super(props, context);
    this._timerSpeed = null;
    this._timer = null;
  }

  componentDidMount() {
    this._ensureTimer();
  }

  componentWillReceiveProps(nextProps) {
    this._ensureTimer(nextProps);
  }

  componentWillUnmount() {
    clearTimeout(this._timer);
    this._timer = null;
  }

  _ensureTimer(props = this.props) {
    if (props.running && (!this._timer || this._timerSpeed !== props.speed)) {
      clearTimeout(this._timer);
      this._timerSpeed = props.speed;
      this._timer = setInterval(this._onTick, this._timerSpeed);
    } else if (!props.running && this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  _onTick = () => {
    const {dispatch, world} = this.props;
    dispatch(advanceGameState(world.id));
  }

  _onRestoreInitialGameState = () => {
    const {dispatch, world} = this.props;
    const stage = getCurrentStageForWorld(world);

    if (window.confirm("Are you sure you want to reset the stage to the saved `Start` state?")) {
      dispatch(restoreInitialGameState(world.id, stage.id));
    }
  }

  _onSaveInitialGameState = () => {
    const {dispatch, world} = this.props;
    const stage = getCurrentStageForWorld(world);

    dispatch(saveInitialGameState(world.id, stage.id, {
      actors: stage.actors,
      thumbnail: getStageScreenshot(stage, {size: 160}),
    }));
  }

  _renderRestartControl() {
    const {startThumbnail} = getCurrentStageForWorld(this.props.world);
    return (
      <div className="left">
        <div className="start-thumbnail restart-button" onClick={this._onRestoreInitialGameState}>
          <img src={startThumbnail} />
          <div className="label">
            <i className="fa fa-fast-backward" /> Restart
          </div>
        </div>
      </div>
    );
  }

  _renderInitialStateControls() {
    const {startThumbnail} = getCurrentStageForWorld(this.props.world);

    return (
      <div className="left">
        <div className="start-thumbnail">
          <img src={startThumbnail} />
        </div>
        <div className="start-buttons">
          <Button
            size="sm"
            onClick={this._onRestoreInitialGameState}
          >
            <i className="fa fa-arrow-up" />
          </Button>
          <Button
            size="sm"
            onClick={this._onSaveInitialGameState}
          >
            <i className="fa fa-arrow-down" />
          </Button>
        </div>
      </div>
    );
  }

  render() {
    const {speed, dispatch, running, world, readonly} = this.props;

    return (
      <div className="stage-controls">
        {readonly ? this._renderRestartControl() : this._renderInitialStateControls()}

        <div style={{flex: 1}} />

        <div className="center" data-tutorial-id="controls">
          {
            (!readonly) && (
              <Button
                size="sm"
                disabled={world.history && world.history.length === 0}
                onClick={() => dispatch(stepBackGameState(world.id))}
              >
                <i className="fa fa-step-backward" /> Back
              </Button>
            )
          }
          {' '}
          <Button
            className={classNames({'selected': !running})}
            onClick={() => dispatch(updatePlaybackState({running: false}))}
          >
            <i className="fa fa-stop" /> Stop
          </Button>
          {' '}
          <Button
            data-tutorial-id="play"
            className={classNames({'selected': running})}
            onClick={() => dispatch(updatePlaybackState({running: true}))}
          >
            <i className="fa fa-play" /> Play
          </Button>
          {' '}
          {
            (!readonly) && (
              <Button
                size="sm"
                onClick={() => dispatch(advanceGameState(world.id))}
              >
                <i className="fa fa-step-forward" /> Forward
              </Button>
            )
          }
        </div>

        <div style={{flex: 1}} />

        <div className="right">
          <ButtonGroup>
            {Object.keys(SPEED_OPTIONS).map((name) =>
              <Button
                size="sm"
                key={name}
                style={{minWidth: 0}}
                className={classNames({'selected': SPEED_OPTIONS[name] === speed})}
                onClick={() => dispatch(updatePlaybackState({speed: SPEED_OPTIONS[name]}))}
              >
                {name}
              </Button>
            )}
          </ButtonGroup>
        </div>
      </div>
    );
  }
}