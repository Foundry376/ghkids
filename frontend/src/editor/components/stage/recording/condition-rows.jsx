import PropTypes from 'prop-types';
import React from 'react';

import { getVariableValue } from "../../../utils/stage-helpers";
import {
  ActorBlock,
  AppearanceBlock,
  TransformBlock,
  VariableBlock,
} from "./blocks";

export class FreeformConditionRow extends React.Component {
  static propTypes = {
    actor: PropTypes.object,
    actors: PropTypes.object,
    characters: PropTypes.object,
    onChange: PropTypes.func,
    condition: PropTypes.shape({
      value: PropTypes.oneOfType([
        PropTypes.shape({
          constant: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        }),
        PropTypes.shape({
          actorId: PropTypes.string.isRequired,
          variableId: PropTypes.string,
        }),
      ]),
      type: PropTypes.string,
      comparator: PropTypes.string,
      variableId: PropTypes.string,
    }),
  };

  static defaultProps = {
    enabled: false,
  };

  state = {
    droppingValue: false,
  };

  render() {
    const { condition, actor, actors, characters, onChange } = this.props;

    const character = characters[actor.characterId];

    const valueActor = condition.value.actorId
      ? actors[condition.value.actorId]
      : actor;
    const valueCharacter = valueActor
      ? characters[valueActor.characterId]
      : character;

    const disambiguate =
      valueActor !== actor && valueActor.characterId === actor.characterId;

    const onDropValue = (e) => {
      if (e.dataTransfer.types.includes("variable")) {
        const { actorId, variableId, type } = JSON.parse(
          e.dataTransfer.getData("variable")
        );
        if (type === condition.type) {
          onChange(true, {
            ...condition,
            value: actorId === actor.id ? {} : { actorId, variableId },
          });
          e.stopPropagation();
        }
      }
      this.setState({ droppingValue: false });
    };

    return (
      <li className={`enabled-true`}>
        <div className="left">
          <ActorBlock
            character={character}
            actor={actor}
            disambiguate={disambiguate}
          />
          {condition.type === "transform" ? "direction" : condition.type}
          {condition.variableId ? (
            <VariableBlock
              name={character.variables[condition.variableId].name}
            />
          ) : undefined}
          {onChange ? (
            <ComparatorSelect
              type={condition.type}
              value={condition.comparator}
              onChange={(e) =>
                onChange(true, { ...condition, comparator: e.target.value })
              }
            />
          ) : (
            ` ${condition.comparator} `
          )}
          <div
            className={`right dropping-${this.state.droppingValue}`}
            title="Drop a variable or appearance here to create an expression linking two variables."
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("variable")) {
                const { type } = JSON.parse(e.dataTransfer.getData("variable"));
                if (type === condition.type) {
                  this.setState({ droppingValue: true });
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            }}
            onDragLeave={() => {
              this.setState({ droppingValue: false });
            }}
            onDrop={onDropValue}
          >
            <FreeformConditionValue
              actor={actor}
              condition={condition}
              valueActor={valueActor}
              valueCharacter={valueCharacter}
              disambiguate={disambiguate}
            />
          </div>
        </div>
        {onChange && (
          <div onClick={() => onChange(false)} className="condition-remove">
            <div />
          </div>
        )}
      </li>
    );
  }
}

const FreeformConditionValue = ({
  actor,
  condition,
  valueActor,
  valueCharacter,
  disambiguate,
}) => {
  const { value, type, variableId } = condition;

  if (!value) {
    return <div>Empty</div>;
  }
  if (valueActor !== actor) {
    return (
      <span>
        <ActorBlock
          character={valueCharacter}
          actor={valueActor}
          disambiguate={disambiguate}
        />
        {type === "transform" ? "direction" : type}
        {value.variableId ? (
          <VariableBlock
            name={
              value.variableId &&
              valueCharacter.variables[value.variableId].name
            }
          />
        ) : undefined}
      </span>
    );
  }
  if (type === "transform") {
    return (
      <TransformBlock
        character={valueCharacter}
        transform={valueActor.transform}
      />
    );
  }
  if (type === "appearance") {
    return (
      <AppearanceBlock
        character={valueCharacter}
        appearanceId={valueActor.appearance}
      />
    );
  }
  if (type === "variable") {
    return (
      <code>{getVariableValue(valueActor, valueCharacter, variableId)}</code>
    );
  }
  return undefined;
};

const ComparatorSelect = ({ type, ...rest }) => (
  <select {...rest}>
    <option value="=">=</option>
    <option value="<=" disabled={type !== "variable"}>
      &lt;=
    </option>
    <option value=">=" disabled={type !== "variable"}>
      &gt;=
    </option>
  </select>
);
