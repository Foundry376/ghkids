import React, {PropTypes} from 'react';

import {STAGE_CELL_SIZE} from '../../constants/constants';
import WorldOperator from '../../utils/world-operator';
import ActorSprite from '../sprites/actor-sprite';

import {extentIgnoredPositions} from '../../utils/recording-helpers';
import {getCurrentStageForWorld} from '../../utils/selectors';
import RecordingIgnoredSprite from '../sprites/recording-ignored-sprite';

export default class ScenarioStage extends React.Component {
  static propTypes = {
    rule: PropTypes.object,
    applyActions: PropTypes.bool,
    maxWidth: PropTypes.number,
    maxHeight: PropTypes.number,
  };

  static contextTypes = {
    characters: PropTypes.object,
  };

  shouldComponentUpdate(nextProps) {
    return (nextProps.rule !== this.props.rule || nextProps.applyActions !== this.props.applyActions);
  }

  render() {
    const {rule, applyActions, maxWidth, maxHeight} = this.props;
    const {world, characters} = window.editorStore.getState();

    const {xmin, xmax, ymin, ymax} = rule.extent;
    const width = (xmax - xmin + 1) * STAGE_CELL_SIZE;
    const height = (ymax - ymin + 1) * STAGE_CELL_SIZE;
    const zoom = Math.min(maxWidth / width, maxHeight / height, 1);

    const ruleWorld = WorldOperator(world, characters).resetForRule(rule, {
      applyActions,
      offset: {x: -xmin, y: -ymin},
    });
    const ruleStage = getCurrentStageForWorld(ruleWorld);
    
    return (
      <div className="scenario-stage" style={{width, height, zoom}}>
        {Object.keys(ruleStage.actors).map((id) =>
          <ActorSprite
            key={id}
            character={characters[ruleStage.actors[id].characterId]}
            actor={ruleStage.actors[id]}
          />
        )}
        {extentIgnoredPositions(rule.extent).map(({x, y}) =>
          <RecordingIgnoredSprite key={`ignored-${x}-${y}`} x={x - xmin} y={y - ymin} />
        )}
      </div>
    );
  }
}
