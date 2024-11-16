import React, {PropTypes} from 'react';
import Sprite from './sprite';

import {STAGE_CELL_SIZE} from '../../constants/constants';

export default class ActorSprite extends React.Component {
  static propTypes = {
    character: PropTypes.object,
    actor: PropTypes.object,
    selected: PropTypes.bool,
    draggable: PropTypes.bool,
    onClick: PropTypes.func,
    onDoubleClick: PropTypes.func,
    transitionDuration: PropTypes.number,
  }

  _onDragStart = (event) => {
    if (!this.props.draggable) {
      event.preventDefault();
      return;
    }
    const {top, left} = event.target.getBoundingClientRect();
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('drag-offset', JSON.stringify({
      dragLeft: event.clientX - left,
      dragTop: event.clientY - top,
    }));
    event.dataTransfer.setData('sprite', JSON.stringify({
      actorId: this.props.actor.id,
    }));
  }

  render() {
    const {actor, character, selected, draggable, transitionDuration} = this.props;

    return (
      <div
        draggable={draggable}
        data-stage-character-id={character.id}
        onDragStart={this._onDragStart}
        onClick={this.props.onClick}
        onDoubleClick={this.props.onDoubleClick}
        className="animated"
        style={{
          position: 'absolute',
          zIndex: selected ? 2 : undefined,
          transitionDuration: `${transitionDuration}ms`, 
          left: actor.position.x * STAGE_CELL_SIZE,
          top: actor.position.y * STAGE_CELL_SIZE,
        }}
      >
        <Sprite
          className={selected ? 'outlined' : ''}
          appearance={actor.appearance}
          transform={actor.transform}
          spritesheet={character.spritesheet}
        />
      </div>
    );
  }
}
