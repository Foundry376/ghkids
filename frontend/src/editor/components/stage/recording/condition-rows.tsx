import React, { useState } from "react";

import {
  Actor,
  Character,
  Characters,
  MathComparator,
  RuleConditionAppearance,
  RuleConditionGlobal,
  RuleConditionTransform,
  RuleConditionVariable,
  RuleValue,
  Stage,
  WorldMinimal,
} from "../../../../types";
import { getVariableValue } from "../../../utils/stage-helpers";
import { ActorBlock, AppearanceBlock, TransformBlock, VariableBlock } from "./blocks";

interface GlobalConditionRowProps {
  actors: Stage["actors"];
  world: WorldMinimal;
  characters: Characters;
  onChange: (keep: boolean, condition?: RuleConditionGlobal) => void;
  condition: RuleConditionGlobal;
}
export const GlobalConditionRow = (props: GlobalConditionRowProps) => {
  const { world, condition, actors, characters, onChange } = props;

  const [droppingValue, setDroppingValue] = useState(false);

  const valueActor =
    "actorId" in condition.value && condition.value.actorId
      ? actors[condition.value.actorId]
      : null;
  const valueCharacter = valueActor ? characters[valueActor.characterId] : null;

  const onDropValue = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("variable")) {
      const { actorId, globalId, variableId, type } = JSON.parse(
        e.dataTransfer.getData("variable"),
      );
      if (type === "variable") {
        onChange(true, {
          ...condition,
          value:
            globalId === condition.globalId
              ? { constant: world.globals[condition.globalId].value }
              : { actorId, globalId, variableId },
        });
        e.stopPropagation();
      }
    }
    setDroppingValue(false);
  };

  return (
    <li className={`enabled-true`}>
      <div className="left">
        <VariableBlock name={world.globals[condition.globalId].name} />
        {onChange ? (
          <ComparatorSelect
            type="global"
            value={condition.comparator}
            onChange={(e) =>
              onChange(true, { ...condition, comparator: e.currentTarget.value as MathComparator })
            }
          />
        ) : (
          ` ${condition.comparator} `
        )}
        <div
          className={`right dropping-${droppingValue}`}
          title="Drop a variable or appearance here to create an expression linking two variables."
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(`variable-type:variable`)) {
              setDroppingValue(true);
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragLeave={() => {
            setDroppingValue(false);
          }}
          onDrop={onDropValue}
        >
          <FreeformConditionValue
            actor={valueActor}
            condition={condition}
            valueActor={valueActor}
            valueCharacter={valueCharacter}
            disambiguate={false}
            onChange={(value) => onChange(true, { ...condition, value })}
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
};

type FreeformCondition = RuleConditionVariable | RuleConditionTransform | RuleConditionAppearance;

interface FreeformConditionRowProps {
  actor: Actor;
  actors: Stage["actors"];
  world: WorldMinimal;
  characters: Characters;
  onChange: (keep: boolean, condition?: FreeformCondition) => void;
  condition: FreeformCondition;
}

export const FreeformConditionRow = (props: FreeformConditionRowProps) => {
  const [droppingValue, setDroppingValue] = useState(false);

  const { condition, actor, actors, characters, onChange } = props;

  const character = actor && characters[actor.characterId];

  const valueActor =
    "actorId" in condition.value && condition.value.actorId
      ? actors[condition.value.actorId]
      : actor;
  const valueCharacter = valueActor ? characters[valueActor.characterId] : character;

  const disambiguate = valueActor !== actor && valueActor.characterId === actor.characterId;

  const onDropValue = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("variable")) {
      const { actorId, globalId, variableId, type } = JSON.parse(
        e.dataTransfer.getData("variable"),
      );
      if (type === condition.type) {
        const value = (
          actorId === actor.id ? {} : globalId ? { globalId } : { actorId, variableId }
        ) as RuleValue;
        onChange(true, { ...condition, value: value });
        e.stopPropagation();
      }
    }
    setDroppingValue(false);
  };

  return (
    <li className={`enabled-true`}>
      <div className="left">
        <ActorBlock character={character} actor={actor} disambiguate={disambiguate} />
        {condition.type === "transform" ? "direction" : condition.type}
        {"variableId" in condition && condition.variableId ? (
          <VariableBlock name={character.variables[condition.variableId].name} />
        ) : undefined}
        {onChange ? (
          <ComparatorSelect
            type={condition.type}
            value={condition.comparator}
            onChange={(e) =>
              onChange(true, { ...condition, comparator: e.currentTarget.value as never })
            }
          />
        ) : (
          ` ${condition.comparator} `
        )}
        <div
          className={`right dropping-${droppingValue}`}
          title="Drop a variable or appearance here to create an expression linking two variables."
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(`variable-type:${condition.type}`)) {
              setDroppingValue(true);
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onDragLeave={() => {
            setDroppingValue(false);
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
};

const FreeformConditionValue = ({
  actor,
  condition,
  valueActor,
  valueCharacter,
  disambiguate,
  onChange,
}: {
  actor: Actor | null;
  condition:
    | RuleConditionVariable
    | RuleConditionTransform
    | RuleConditionAppearance
    | RuleConditionGlobal;
  valueActor: Actor | null;
  valueCharacter: Character | null;
  disambiguate: boolean;
  onChange?: (value: { constant: number }) => void;
}) => {
  const { value, type } = condition;

  if (!value) {
    return <div>Empty</div>;
  }
  if (valueActor && valueCharacter) {
    if (valueActor && valueActor !== actor) {
      return (
        <span>
          <ActorBlock character={valueCharacter} actor={valueActor} disambiguate={disambiguate} />
          {type === "transform" ? "direction" : type}
          {"variableId" in value ? (
            <VariableBlock
              name={(value.variableId && valueCharacter.variables[value.variableId].name) || ""}
            />
          ) : undefined}
        </span>
      );
    }
    if (type === "transform") {
      return <TransformBlock character={valueCharacter} transform={valueActor.transform} />;
    }
    if (type === "appearance") {
      return <AppearanceBlock character={valueCharacter} appearanceId={valueActor.appearance} />;
    }
  }
  if (type === "variable") {
    if ("variableId" in condition) {
      return (
        <code>
          {valueActor && valueCharacter
            ? getVariableValue(valueActor, valueCharacter, condition.variableId)
            : "?unsupported?"}
        </code>
      );
    } else if ("globalId" in condition && "constant" in value) {
      return (
        <code>
          <input
            type="number"
            value={Number(value.constant)}
            onChange={(e) => onChange?.({ constant: Number(e.target.value) })}
          />
        </code>
      );
    } else {
      return <code>unknown</code>;
    }
  }
  return <span />;
};

const ComparatorSelect = ({
  type,
  ...rest
}: React.HTMLProps<HTMLSelectElement> & {
  type?: "variable" | "transform" | "appearance" | "global";
}) => (
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
