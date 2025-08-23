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
import { ActorVariableBlock, AppearanceBlock, TransformBlock } from "./blocks";

interface FreeformConditionRowProps {
  actors: Stage["actors"];
  world: WorldMinimal;
  characters: Characters;
  condition: RuleCondition;
  onChange?: (keep: boolean, condition: RuleCondition) => void;
}

type ImpliedDatatype =
  | { type: "transform" }
  | { type: "appearance"; character: Character }
  | { type: "key" }
  | null;

export const FreeformConditionRow = ({
  condition,
  actors,
  world,
  characters,
  onChange,
}: FreeformConditionRowProps) => {
  const { left, right, comparator } = condition;
  const selectedToolId = useSelector<EditorState>((state) => state.ui.selectedToolId);
  const dispatch = useDispatch();

  const leftActor = "actorId" in left ? actors[left.actorId] : null;
  const leftCharacter = leftActor && characters[leftActor.characterId];
  const rightActor = "actorId" in right ? actors[right.actorId] : null;
  const rightCharacter = rightActor && characters[rightActor.characterId];

  const disambiguate =
    leftActor && rightActor && leftActor !== rightActor
      ? leftActor.characterId === rightActor.characterId
      : false;

  const variableIds = [
    "variableId" in left && left.variableId,
    "variableId" in right && right.variableId,
  ];
  const globalIds = ["globalId" in left && left.globalId, "globalId" in right && right.globalId];
  const impliedDatatype: ImpliedDatatype = variableIds.includes("transform")
    ? { type: "transform" }
    : variableIds.includes("appearance")
      ? { type: "appearance", character: leftCharacter! || rightCharacter! }
      : globalIds.includes("keypress")
        ? { type: "key" }
        : null;

  const onToolClick = (e: React.MouseEvent) => {
    if (selectedToolId === TOOLS.TRASH) {
      onChange?.(false, condition);
      if (!e.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  return (
    <li className={`enabled-true tool-${selectedToolId}`} onClick={onToolClick}>
      <FreeformConditionValue
        conditionId={condition.key}
        value={left}
        actor={leftActor}
        world={world}
        character={leftCharacter}
        disambiguate={disambiguate}
        onChange={onChange ? (value) => onChange(true, { ...condition, left: value }) : undefined}
        impliedDatatype={impliedDatatype}
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
        actor={rightActor}
        world={world}
        character={rightCharacter}
        disambiguate={disambiguate}
        onChange={onChange ? (value) => onChange(true, { ...condition, right: value }) : undefined}
        impliedDatatype={impliedDatatype}
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

export const FreeformConditionValue = ({
  value,
  actor,
  character,
  world,
  disambiguate,
  onChange,
  impliedDatatype,
  conditionId,
}: {
  value: RuleValue;
  actor: Actor | null;
  character: Character | null;
  world: WorldMinimal;
  disambiguate: boolean;
  onChange?: (value: RuleValue) => void;
  impliedDatatype: ImpliedDatatype;
  conditionId?: string;
}) => {
  const selectedToolId = useSelector<EditorState>((state) => state.ui.selectedToolId);
  const dispatch = useDispatch();

  const [droppingValue, setDroppingValue] = useState(false);

  const onDropValue = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("variable")) {
      const { actorId, globalId, variableId } = JSON.parse(e.dataTransfer.getData("variable"));
      const value = (globalId ? { globalId } : { actorId, variableId }) as RuleValue;
      onChange?.(value);
      e.stopPropagation();
    }
    setDroppingValue(false);
  };

  const inner = () => {
    if (!value) {
      return <div>Empty</div>;
    }
    if ("actorId" in value && actor && character) {
      return (
        <ActorVariableBlock
          character={character}
          actor={actor}
          disambiguate={disambiguate}
          variableId={value.variableId}
        />
      );
    }
    if ("constant" in value) {
      if (impliedDatatype?.type === "transform") {
        if (onChange) {
          return (
            <TransformDropdown
              value={(value.constant as ActorTransform) ?? ""}
              onChange={(e) => onChange?.({ constant: e ?? "" })}
              displayAsLabel
            />
          );
        } else {
          return <TransformBlock transform={value.constant as ActorTransform} />;
        }
      }
      if (impliedDatatype?.type === "appearance") {
        if (onChange) {
          return (
            <AppearanceDropdown
              value={value.constant}
              spritesheet={impliedDatatype.character.spritesheet}
              onChange={(e) => onChange?.({ constant: e ?? "" })}
            />
          );
        } else {
          return (
            <AppearanceBlock character={impliedDatatype.character} appearanceId={value.constant} />
          );
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
            {value.constant}
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
      const icon =
        value.globalId === "keypress" ? (
          <img
            style={{ width: 40, height: 40, zoom: 0.6, verticalAlign: "middle", marginRight: 8 }}
            src={new URL("../../../img/icon_event_key.png", import.meta.url).href}
          />
        ) : value.globalId === "selectedStageId" ? (
          <img
            style={{ width: 40, height: 40, zoom: 0.6, verticalAlign: "middle", marginRight: 8 }}
            src={new URL("../../../img/sidebar_choose_background.png", import.meta.url).href}
          />
        ) : (
          <div
            style={{
              fontSize: "20px",
              lineHeight: "24px",
              paddingTop: 2,
              marginRight: 8,
              verticalAlign: "middle",
            }}
          >
            🌐
          </div>
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
      className={`right tool-${selectedToolId} dropping-${droppingValue}`}
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
  "<=": "<=",
  ">=": ">=",
  contains: "contains",
  "starts-with": "starts with",
  "ends-with": "ends with",
};

function comparatorsForImpliedDatatype(inferred: ImpliedDatatype) {
  if (inferred?.type === "key") {
    return ["=", "contains"];
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
