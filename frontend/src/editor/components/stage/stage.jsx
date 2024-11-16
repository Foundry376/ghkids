import React, {PropTypes} from 'react';
import {connect} from 'react-redux';


import ActorSprite from '../sprites/actor-sprite';
import RecordingMaskSprite from '../sprites/recording-mask-sprite';
import RecordingIgnoredSprite from '../sprites/recording-ignored-sprite';
import RecordingHandle from '../sprites/recording-handle';

import {createActor, changeActor, deleteActor, recordClickForGameState, recordKeyForGameState} from '../../actions/stage-actions';
import {select, selectToolId, paintCharacterAppearance} from '../../actions/ui-actions';
import {setRecordingExtent, setupRecordingForActor, toggleSquareIgnored} from '../../actions/recording-actions';

import {STAGE_CELL_SIZE, TOOL_POINTER, TOOL_TRASH, TOOL_RECORD, TOOL_PAINT, TOOL_IGNORE_SQUARE} from '../../constants/constants';
import {extentIgnoredPositions} from '../../utils/recording-helpers';
import {pointIsOutside, buildActorPath} from '../../utils/stage-helpers';

import * as CustomPropTypes from '../../constants/custom-prop-types';

class Stage extends React.Component {
  static propTypes = {
    readonly: PropTypes.bool,

    world: PropTypes.object,
    stage: PropTypes.object,
    style: PropTypes.object,
    recordingCentered: PropTypes.bool,
    recordingExtent: CustomPropTypes.RecordingExtent,

    dispatch: PropTypes.func,
    selectedToolId: PropTypes.string,
    selectedActorPath: CustomPropTypes.WorldSelection,
    characters: PropTypes.object,
    playback: PropTypes.shape({
      running: PropTypes.bool,
      speed: PropTypes.number,
    }),
  };

  constructor(props, context) {
    super(props, context);
    this._lastFiredExtent = null;
    this._lastActorPositions = {};
    this.state = {
      top: 0,
      left: 0,
    };
  }

  componentDidUpdate() {
    if (this.props.playback.running && this._el) {
      this._el.focus();
    }

    let offset = {top: 0, left: 0};
    if (this.props.recordingExtent && this.props.recordingCentered) {
      offset = this._centerOnExtent();
    }

    if ((this.state.top !== offset.top) || (this.state.left !== offset.left)) {
      this.setState(offset);
    }
  }

  _centerOnExtent() {
    const {xmin, ymin, xmax, ymax} = this.props.recordingExtent;
    const xCenter = (xmin + 0.5 + (xmax - xmin) / 2.0);
    const yCenter = (ymin + 0.5 + (ymax - ymin) / 2.0);
    return {
      left: `calc(-${xCenter * STAGE_CELL_SIZE}px + 50%)`,
      top: `calc(-${yCenter * STAGE_CELL_SIZE}px + 50%)`,
    };
  }

  _onBlur = () => {
    if (this.props.playback.running) {
      this._el.focus();
    }
  }

  _onKeyDown = (event) => {
    const {dispatch, selectedActorPath, world} = this.props;

    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      // do not catch these events, they're probably actual hotkeys
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.keyCode === 127 || event.keyCode === 8) {
      if (selectedActorPath.worldId === world.id) {
        dispatch(deleteActor(selectedActorPath));
      }
      return;
    }

    dispatch(recordKeyForGameState(world.id, event.keyCode));
  }

  _onDragOver = (event) => {
    event.preventDefault();
    if (event.dataTransfer.types.includes('handle')) {
      this._onUpdateHandle(event);
    }
  }

  _onDrop = (event) => {
    if (event.dataTransfer.types.includes('sprite')) {
      this._onDropSprite(event);
    }
    if (event.dataTransfer.types.includes('appearance')) {
      this._onDropAppearance(event);
    }
    if (event.dataTransfer.types.includes('handle')) {
      this._onUpdateHandle(event);
    }
  }

  _onUpdateHandle = (event) => {
    const stage = this.props.stage;
    const side = event.dataTransfer.types.find(t => t.startsWith('handle:')).split(':').pop();
    const stageOffset = this._el.getBoundingClientRect();
    const position = {
      x: (event.clientX - stageOffset.left) / STAGE_CELL_SIZE,
      y: (event.clientY - stageOffset.top) / STAGE_CELL_SIZE,
    };

    // expand the extent of the recording rule to reflect this new extent
    const nextExtent = Object.assign({}, this.props.recordingExtent);
    if (side === 'left') { nextExtent.xmin = Math.min(nextExtent.xmax, Math.max(0, Math.round(position.x + 0.25))); }
    if (side === 'right') { nextExtent.xmax = Math.max(nextExtent.xmin, Math.min(stage.width, Math.round(position.x - 1))); }
    if (side === 'top') { nextExtent.ymin = Math.min(nextExtent.ymax, Math.max(0, Math.round(position.y + 0.25))); }
    if (side === 'bottom') { nextExtent.ymax = Math.max(nextExtent.ymin, Math.min(stage.height, Math.round(position.y - 1))); }

    const str = JSON.stringify(nextExtent);
    if (this._lastFiredExtent === str) {
      return;
    }
    this._lastFiredExtent = str;
    this.props.dispatch(setRecordingExtent(nextExtent));
  }

  _getPositionForEvent(event) {
    const stageOffset = this._el.getBoundingClientRect();
    const dragOffset = event.dataTransfer && event.dataTransfer.getData('drag-offset');

    // subtracting half when no offset is present is a lazy way of doing Math.floor instead of Math.round!
    const halfOffset = {dragTop: STAGE_CELL_SIZE/2, dragLeft: STAGE_CELL_SIZE/2};
    const {dragLeft, dragTop} = dragOffset ? JSON.parse(dragOffset) : halfOffset;
    return {
      x: Math.round((event.clientX - dragLeft - stageOffset.left) / STAGE_CELL_SIZE),
      y: Math.round((event.clientY - dragTop - stageOffset.top) / STAGE_CELL_SIZE),
    };
  }

  _onDropAppearance = (event) => {
    const {stage, dispatch, recordingExtent} = this.props;

    const {appearance, characterId} = JSON.parse(event.dataTransfer.getData('appearance'));
    const position = this._getPositionForEvent(event);
    if (recordingExtent && pointIsOutside(position, recordingExtent)) {
      return;
    }
    const actor = Object.values(stage.actors).find(a => 
      a.position.x === position.x && a.position.y === position.y && a.characterId === characterId
    );
    if (actor) {
      dispatch(changeActor(this._actorPath(actor.id), {appearance}));
    }
  }

  _onDropSprite = (event) => {
    const {stage, characters, dispatch, recordingExtent} = this.props;
    const {actorId, characterId} = JSON.parse(event.dataTransfer.getData('sprite'));
    const position = this._getPositionForEvent(event);

    if (recordingExtent && pointIsOutside(position, recordingExtent)) {
      return;
    }

    if (actorId) {
      if (event.altKey) {
        const actor = stage.actors[actorId];
        if (actor.position.x === position.x && actor.position.y === position.y) {
          // attempting to drop in the same place we started the drag, don't do anything
          return;
        }
        const character = characters[actor.characterId];
        const clonedActor = Object.assign({}, actor, {position});
        dispatch(createActor(this._stagePath(), character, clonedActor));
      } else {
        dispatch(changeActor(this._actorPath(actorId), {position}));
      }
    } else if (characterId) {
      const character = characters[characterId];
      dispatch(createActor(this._stagePath(), character, {position}));
    }
  }

  _onClickActor = (actor, event) => {
    event.preventDefault();
    event.stopPropagation();

    const {selectedToolId, dispatch, world} = this.props;
    switch (selectedToolId) {
      case TOOL_PAINT:
        dispatch(paintCharacterAppearance(actor.characterId, actor.appearance));
        break;
      case TOOL_TRASH:
        dispatch(deleteActor(this._actorPath(actor.id)));
        break;
      case TOOL_RECORD:
        dispatch(setupRecordingForActor({
          characterId: actor.characterId,
          actor: actor,
          ruleId: null,
        }));
        break;
      case TOOL_IGNORE_SQUARE:
        dispatch(toggleSquareIgnored(this._getPositionForEvent(event)));
        break;
      case TOOL_POINTER:
        dispatch(recordClickForGameState(world.id, actor.id));
        break;
    }

    if (selectedToolId !== TOOL_POINTER && !event.shiftKey) {
      dispatch(selectToolId(TOOL_POINTER));
    }
  }

  _onClickStage = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const {selectedToolId, dispatch} = this.props;
    if (selectedToolId === TOOL_IGNORE_SQUARE) {
      dispatch(toggleSquareIgnored(this._getPositionForEvent(event)));
    }

    if (selectedToolId !== TOOL_POINTER && !event.shiftKey) {
      dispatch(selectToolId(TOOL_POINTER));
    }
  }

  _onSelectActor = (actor) => {
    const {selectedToolId, dispatch} = this.props;
    if (selectedToolId === TOOL_POINTER) {
      dispatch(select(actor.characterId, this._actorPath(actor.id)));
    }
  }

  _actorPath = (actorId) => {
    return buildActorPath(this.props.world.id, this.props.stage.id, actorId);
  }

  _stagePath = () => {
    return {stageId: this.props.stage.id, worldId: this.props.world.id};
  }

  _renderRecordingExtent() {
    const {width, height} = this.props.stage;
    const {xmin, xmax, ymin, ymax} = this.props.recordingExtent;

    const components = [];

    // add the dark squares
    components.push(
      <RecordingMaskSprite key={`mask-top`} xmin={0} xmax={width} ymin={0} ymax={ymin} />,
      <RecordingMaskSprite key={`mask-bottom`} xmin={0} xmax={width} ymin={ymax + 1} ymax={height} />,
      <RecordingMaskSprite key={`mask-left`} xmin={0} xmax={xmin} ymin={ymin} ymax={ymax + 1} />,
      <RecordingMaskSprite key={`mask-right`} xmin={xmax + 1} xmax={width} ymin={ymin} ymax={ymax + 1} />,
    );

    // add the ignored squares
    extentIgnoredPositions(this.props.recordingExtent)
      .filter(({x, y}) => x >= xmin && x <= xmax && y >= ymin && y <= ymax)
      .forEach(({x, y}) => { 
        components.push(
          <RecordingIgnoredSprite x={x} y={y} key={`ignored-${x}-${y}`} />
        );
      });
    
    // add the handles
    const handles = {
      top: [xmin + (xmax - xmin) / 2.0, ymin - 1],
      bottom: [xmin + (xmax - xmin) / 2.0, ymax + 1],
      left: [xmin - 1, ymin + (ymax - ymin) / 2.0],
      right: [xmax + 1, ymin + (ymax - ymin) / 2.0],
    };
    for (const side of Object.keys(handles)) {
      const [x, y] = handles[side];
      components.push(
        <RecordingHandle key={side} side={side} position={{x, y}} />
      );
    }

    return components;
  }

  render() {
    const {selectedToolId, characters, selectedActorPath, playback, recordingExtent, style, stage, world, readonly} = this.props;

    if (!stage) {
      return (
        <div
          style={style}
          ref={(el) => this._scrollEl = el}
          className="stage-scroll-wrap"
        />
      );
    }

    let selected = null;
    if (selectedActorPath.worldId === world.id && selectedActorPath.stageId === stage.id) {
      selected = stage.actors[selectedActorPath.actorId];
    }

    return (
      <div
        style={style}
        ref={(el) => this._scrollEl = el}
        data-stage-wrap-id={world.id}
        className={`stage-scroll-wrap tool-${selectedToolId} running-${playback.running}`}
      >
        <div
          ref={(el) => this._el = el}
          style={{
            top: this.state.top,
            left: this.state.left,
          }}
          className="stage"
          onDragOver={this._onDragOver}
          onDrop={this._onDrop}
          onKeyDown={this._onKeyDown}
          onBlur={this._onBlur}
          onClick={this._onClickStage}
          tabIndex={0}
        >
          <div className="background" style={{
            position: 'absolute',
            width: stage.width * STAGE_CELL_SIZE,
            height: stage.height * STAGE_CELL_SIZE,
            background: `url(${require('../../img/board-grid.png')}) top left, ${stage.background}`,
            backgroundSize: '40px, cover',
          }} />
          {
            Object.values(stage.actors).map((actor) => {
              const character = characters[actor.characterId];

              const lastPosition = this._lastActorPositions[actor.id] || {x: Math.NaN, y: Math.NaN};
              const didWrap = Math.abs(lastPosition.x - actor.position.x) > 6 || Math.abs(lastPosition.y - actor.position.y) > 6;
              this._lastActorPositions[actor.id] = Object.assign({}, actor.position);

              return (
                <ActorSprite
                  draggable={!readonly}
                  key={`${actor.id}-${didWrap}`}
                  selected={actor === selected}
                  onClick={(event) => this._onClickActor(actor, event)}
                  onDoubleClick={() => this._onSelectActor(actor)}
                  transitionDuration={playback.speed}
                  character={character}
                  actor={actor}
                />
              );
            })
          }
          {recordingExtent ? this._renderRecordingExtent() : []}
        </div>
      </div>
    );
  }
}

function mapStateToProps(state) {
  return Object.assign({}, {
    selectedActorPath: state.ui.selectedActorPath,
    selectedToolId: state.ui.selectedToolId,
    playback: state.ui.playback,
    characters: state.characters,
  });
}

export default connect(
  mapStateToProps,
)(Stage);
