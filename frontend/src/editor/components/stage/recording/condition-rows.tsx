import React, { useState } from "react";

import { useDispatch, useSelector } from "react-redux";
import { Button } from "reactstrap";
import {
  Actor,
  ActorTransform,
  Character,
  Characters,
  EditorState,
  RuleCondition,
  RuleValue,
  Stage,
  VariableComparator,
  WorldMinimal,
} from "../../../../types";
import { pickConditionValueFromKeyboard, selectToolId } from "../../../actions/ui-actions";
import { TOOLS } from "../../../constants/constants";
import { AppearanceDropdown, TransformDropdown } from "../../inspector/container-pane-variables";
import { ActorBlock, ActorVariableBlock, AppearanceBlock, TransformBlock } from "./blocks";

interface FreeformConditionRowProps {
  actors: Stage["actors"];
  world: WorldMinimal;
  characters: Characters;
  condition: RuleCondition;
  onChange?: (keep: boolean, condition: RuleCondition) => void;
}

type ImpliedDatatype =
  | { type: "transform"; characterId?: string; appearance?: string }
  | { type: "appearance"; character: Character }
  | { type: "key" }
  | { type: "actor" }
  | null;

export const FreeformConditionRow = ({
  condition,
  actors,
  world,
  characters,
  onChange,
}: FreeformConditionRowProps) => {
  const { left, right, comparator } = condition;
  const selectedToolId = useSelector<EditorState, TOOLS>((state) => state.ui.selectedToolId);
  const dispatch = useDispatch();

  const impliedDatatype: ImpliedDatatype = (() => {
    const variableIds = [
      "variableId" in left && left.variableId,
      "variableId" in right && right.variableId,
    ];
    const globals = [
      "globalId" in left && world.globals[left.globalId],
      "globalId" in right && world.globals[right.globalId],
    ];

    const globalType = globals.map((g) => (g && `type` in g ? g.type : null)).filter(Boolean)[0];
    if (globalType) {
      return { type: globalType } as ImpliedDatatype;
    }
    if (variableIds.includes("transform")) {
      const actorId = "actorId" in left ? left.actorId : "actorId" in right ? right.actorId : null;
      return {
        type: "transform",
        characterId: actorId ? actors[actorId]?.characterId : undefined,
        appearance: actorId ? actors[actorId]?.appearance : undefined,
      };
    }
    if (variableIds.includes("appearance")) {
      const actorId = "actorId" in left ? left.actorId : "actorId" in right ? right.actorId : null;
      const character = actorId && characters[actors[actorId].characterId];
      if (character) {
        return { type: "appearance", character };
      }
    }
    return null;
  })();

  const onToolClick = (e: React.MouseEvent) => {
    if (selectedToolId === TOOLS.TRASH) {
      onChange?.(false, condition);
      if (!e.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  return (
    <li className={`enabled-true tool-supported`} onClick={onToolClick}>
      <FreeformConditionValue
        conditionId={condition.key}
        value={left}
        actors={actors}
        world={world}
        characters={characters}
        onChange={onChange ? (value) => onChange(true, { ...condition, left: value }) : undefined}
        impliedDatatype={impliedDatatype}
        comparator={comparator}
      />

      {onChange ? (
        <ComparatorSelect
          value={comparator}
          onChange={(comparator) => onChange(true, { ...condition, comparator })}
          impliedDatatype={impliedDatatype}
        />
      ) : (
        ` ${ComparatorLabels[condition.comparator]} `
      )}

      <FreeformConditionValue
        conditionId={condition.key}
        value={right}
        actors={actors}
        world={world}
        characters={characters}
        onChange={onChange ? (value) => onChange(true, { ...condition, right: value }) : undefined}
        impliedDatatype={impliedDatatype}
        comparator={comparator}
      />

      <div style={{ flex: 1 }} />
      {onChange && (
        <div onClick={() => onChange(false, condition)} className="condition-remove">
          <div />
        </div>
      )}
    </li>
  );
};

const GLOBAL_ICONS: { [id: string]: string } = {
  click: new URL("../../../img/icon_event_click.png", import.meta.url).href,
  keypress: new URL("../../../img/icon_event_key.png", import.meta.url).href,
  selectedStageId: new URL("../../../img/sidebar_choose_background.png", import.meta.url).href,
};

export const FreeformConditionValue = ({
  value,
  world,
  actors,
  characters,
  onChange,
  impliedDatatype,
  conditionId,
  comparator,
}: {
  value: RuleValue;
  world: WorldMinimal;
  characters: Characters;
  actors: { [actorId: string]: Actor };
  onChange?: (value: RuleValue) => void;
  impliedDatatype: ImpliedDatatype;
  conditionId?: string;
  comparator: VariableComparator;
}) => {
  const selectedToolId = useSelector<EditorState, TOOLS>((state) => state.ui.selectedToolId);
  const dispatch = useDispatch();

  const [droppingValue, setDroppingValue] = useState(false);

  const onDropValue = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("variable")) {
      const { actorId, globalId, variableId } = JSON.parse(e.dataTransfer.getData("variable"));
      const value = (globalId ? { globalId } : { actorId, variableId }) as RuleValue;
      onChange?.(value);
      e.stopPropagation();
    }
    if (e.dataTransfer.types.includes("sprite")) {
      const { dragAnchorActorId } = JSON.parse(e.dataTransfer.getData("sprite"));
      onChange?.({ constant: dragAnchorActorId });
    }
    setDroppingValue(false);
  };

  const inner = () => {
    if (!value) {
      return <div>Empty</div>;
    }
    if ("actorId" in value) {
      const actor = actors[value.actorId];
      const character = actor && characters[actor.characterId];

      if (actor && character) {
        const disambiguate =
          Object.values(actors).filter((a) => a.characterId === character.id).length > 1;
        return (
          <ActorVariableBlock
            character={character}
            actor={actor}
            disambiguate={disambiguate}
            variableId={value.variableId}
          />
        );
      }
    }
    if ("constant" in value) {
      if (impliedDatatype?.type === "transform") {
        if (onChange) {
          return (
            <TransformDropdown
              value={(value.constant as ActorTransform) ?? ""}
              appearance={impliedDatatype.appearance}
              characterId={impliedDatatype.characterId}
              onChange={(e) => onChange?.({ constant: e ?? "" })}
              displayAsLabel
            />
          );
        } else {
          return <TransformBlock transform={value.constant as ActorTransform} />;
        }
      }
      if (impliedDatatype?.type === "appearance") {
        if (["!=", "="].includes(comparator)) {
          if (onChange) {
            return (
              <AppearanceDropdown
                appearance={value.constant}
                spritesheet={impliedDatatype.character.spritesheet}
                onChange={(e) => onChange?.({ constant: e ?? "" })}
              />
            );
          } else {
            return (
              <AppearanceBlock
                character={impliedDatatype.character}
                appearanceId={value.constant}
              />
            );
          }
        }
      }
      if (impliedDatatype?.type === "actor") {
        const actor = actors[value.constant];
        const character = actor && characters[actor.characterId];
        if (actor && character) {
          const disambiguate =
            Object.values(actors).filter((a) => a.characterId === character.id).length > 1;
          return <ActorBlock actor={actor} character={character} disambiguate={disambiguate} />;
        }
      }
      if (impliedDatatype?.type === "key" && conditionId && onChange) {
        return (
          <Button
            size="sm"
            onClick={() => {
              dispatch(pickConditionValueFromKeyboard(true, value.constant, conditionId));
            }}
          >
            {value.constant || "Choose…"}
          </Button>
        );
      }

      if (onChange) {
        return (
          <input
            type="text"
            value={value.constant}
            style={{ width: 80 }}
            onChange={(e) => onChange?.({ constant: e.target.value })}
          />
        );
      }
      return <code>"{value.constant}"</code>;
    }

    if ("globalId" in value) {
      const icon = GLOBAL_ICONS[value.globalId] ? (
        <img
          style={{ width: 40, height: 40, zoom: 0.6, verticalAlign: "middle", marginRight: 8 }}
          src={GLOBAL_ICONS[value.globalId]}
        />
      ) : (
        <span
          style={{ fontSize: "20px", lineHeight: "24px", marginRight: 6, verticalAlign: "middle" }}
        >
          🌐
        </span>
      );

      return (
        <code>
          {icon}
          {world.globals[value.globalId]?.name ?? value.globalId}
        </code>
      );
    }

    return <span />;
  };

  const onDeleteValue = () => {
    if (impliedDatatype?.type === "appearance") {
      const appearanceIds = Object.keys(impliedDatatype.character.spritesheet.appearances);
      onChange?.({ constant: appearanceIds[0] });
    } else if (impliedDatatype?.type === "transform") {
      onChange?.({ constant: "0" });
    } else {
      onChange?.({ constant: "" });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      onDeleteValue();
    }
  };

  const onToolClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (selectedToolId === TOOLS.TRASH) {
      onDeleteValue();
      if (!e.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={onToolClick}
      className={`right tool-supported dropping-${droppingValue}`}
      title="Drop a variable or appearance here to create an expression linking two variables."
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(`variable`)) {
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
      <div style={selectedToolId !== TOOLS.POINTER ? { pointerEvents: "none" } : {}}>{inner()}</div>
    </div>
  );
};

const ComparatorLabels = {
  "=": "is",
  "!=": "is not",
  "<": "<",
  "<=": "<=",
  ">": ">",
  ">=": ">=",
  contains: "contains",
  "starts-with": "starts with",
  "ends-with": "ends with",
};

function comparatorsForImpliedDatatype(inferred: ImpliedDatatype) {
  if (inferred?.type === "key") {
    return ["=", "contains"];
  }
  if (inferred?.type === "actor") {
    return ["=", "!="];
  }
  if (inferred?.type === "appearance") {
    return ["=", "!=", "contains", "starts-with", "ends-with"];
  }
  return ["=", "!="];
}

const ComparatorSelect = ({
  value,
  onChange,
  impliedDatatype,
  ...rest
}: Omit<React.HTMLProps<HTMLSelectElement>, "value" | "onChange"> & {
  value: VariableComparator;
  onChange: (value: VariableComparator) => void;
  impliedDatatype: ImpliedDatatype;
}) => (
  <select {...rest} value={value} onChange={(e) => onChange(e.target.value as VariableComparator)}>
    {Object.entries(ComparatorLabels)
      .filter((t) =>
        impliedDatatype ? comparatorsForImpliedDatatype(impliedDatatype).includes(t[0]) : true,
      )
      .map(([key, value]) => (
        <option key={key} value={key}>
          {value}
        </option>
      ))}
  </select>
);
