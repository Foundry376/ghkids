import React, {PropTypes} from 'react';

import {TransformConditionRow, AppearanceConditionRow, VariableConditionRow} from './condition-rows';

import {getVariableValue, pointIsInside} from '../../../utils/stage-helpers';
import {updateRecordingCondition} from '../../../actions/recording-actions';
import {getCurrentStageForWorld} from '../../../utils/selectors';


export default class RecordingConditions extends React.Component {
  static propTypes = {
    dispatch: PropTypes.func,
    recording: PropTypes.object,
    characters: PropTypes.object,
  };

  render() {
    const {recording, characters, dispatch} = this.props;
    const {beforeWorld, conditions, extent} = recording;
    const stage = getCurrentStageForWorld(beforeWorld);

    const rows = [];
    Object.values(stage.actors).forEach((a) => {
      const saved = conditions[a.id] || {};
      const character = characters[a.characterId];

      if (!pointIsInside(a.position, extent)) {
        return;
      }
      rows.push(
        <TransformConditionRow
          key={`${a.id}-transform`}
          character={character}
          actor={a}
          transform={a.transform}
          onChange={(enabled) =>
            dispatch(updateRecordingCondition(a.id, 'transform', {enabled}))
          }
          {...saved['transform']}
        />
      );
      rows.push(
        <AppearanceConditionRow
          key={`${a.id}-appearance`}
          character={character}
          actor={a}
          appearance={a.appearance}
          onChange={(enabled) =>
            dispatch(updateRecordingCondition(a.id, 'appearance', {enabled}))
          }
          {...saved['appearance']}
        />
      );


      for (const vkey of Object.keys(character.variables)) {
        rows.push(
          <VariableConditionRow
            key={`${a.id}-var-${vkey}`}
            character={character}
            actor={a}
            variableId={vkey}
            variableValue={getVariableValue(a, character, vkey)}
            onChange={(enabled, comparator) =>
              dispatch(updateRecordingCondition(a.id, vkey, {enabled, comparator}))
            }
            {...saved[vkey]}
          />
        );
      }
    });

    return (
      <div style={{flex: 1, marginRight: 3}}>
        <h2>When the picture matches and:</h2>
        <ul>
          {rows}
        </ul>
      </div>
    );
  }
}