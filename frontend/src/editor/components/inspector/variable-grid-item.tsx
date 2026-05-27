import { useState } from "react";
import { Character, Global, StageVariable } from "../../../types";
import { ConnectedActorBlock } from "../stage/recording/blocks";
import { TapToEditLabel } from "../tap-to-edit-label";
import ConnectedStagePicker from "./connected-stage-picker";

export const VariableGridItem = ({
  actorId,
  kind = "actor",
  draggable,
  disabled,
  readonly = false,
  value,
  isMixed = false,
  definition,
  onChangeDefinition,
  onBlurValue,
  onChangeValue,
  onClick,
}: {
  actorId: string | null;
  /** Selects the drag payload shape and how the displayed value relates to the definition. */
  kind?: "actor" | "global" | "stageVariable";
  draggable: boolean;
  disabled: boolean;
  readonly?: boolean;
  value: string;
  /** When true, values differ across multiple selected actors */
  isMixed?: boolean;
  definition: Character["variables"][0] | Global | StageVariable;
  onChangeValue: (id: string, value: string | undefined) => void;
  onChangeDefinition: (id: string, partial: Partial<Character["variables"][0]>) => void;
  onBlurValue: (id: string, value: string | undefined) => void;
  onClick: (id: string, event: React.MouseEvent) => void;
}) => {
  const defaultValue = "defaultValue" in definition ? definition.defaultValue : undefined;
  const displayValue = isMixed ? "" : (value !== undefined ? value : defaultValue);

  const type =
    "type" in definition
      ? definition.type
      : displayValue?.startsWith("stage:")
        ? "stage"
        : displayValue?.startsWith("actor")
          ? "actor"
          : null;

  const isBuiltin = "type" in definition && definition.type === "boolean";

  const [dropping, setDropping] = useState(false);

  const _onDragStart = (event: React.DragEvent) => {
    // Don't allow dragging if values are mixed
    if (isMixed) {
      event.preventDefault();
      return;
    }
    const dragValue = value !== undefined ? value : defaultValue;

    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    let payload: Record<string, string>;
    if (kind === "stageVariable") {
      payload = { stageVariableId: definition.id, value: dragValue || "" };
    } else if (actorId) {
      payload = { actorId: actorId, variableId: definition.id, value: dragValue || "" };
    } else {
      payload = { globalId: definition.id, value: dragValue || "" };
    }
    event.dataTransfer.setData("variable", JSON.stringify(payload));
  };

  const _onDragOver = (event: React.DragEvent) => {
    if (type === "actor" && event.dataTransfer.types.includes("sprite")) {
      event.preventDefault();
      setDropping(true);
    }
  };

  const _onDragLeave = () => {
    setDropping(false);
  };

  const _onDrop = (event: React.DragEvent) => {
    if (type === "actor" && event.dataTransfer.types.includes("sprite")) {
      const { dragAnchorActorId } = JSON.parse(event.dataTransfer.getData("sprite"));
      onChangeValue(definition.id, dragAnchorActorId);
      event.preventDefault();
      event.stopPropagation();
    }
    setDropping(false);
  };

  let content = null;

  if (readonly) {
    content = <div className="value">{isMixed ? "—" : displayValue}</div>;
  } else if (type === "boolean") {
    const checked = displayValue === "true";
    content = (
      <label className="value variable-boolean">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChangeValue(definition.id, e.target.checked ? "true" : "false")}
        />
        <span className="variable-boolean-label">{checked ? "On" : "Off"}</span>
      </label>
    );
  } else if (type === "stage") {
    content = (
      <ConnectedStagePicker
        value={`${displayValue}`}
        disabled={disabled}
        onChange={(e) => onChangeValue(definition.id, e.target.value)}
      />
    );
  } else if (type === "actor") {
    content = (
      <div className="value sprite">
        {displayValue && <ConnectedActorBlock actorId={displayValue} />}
      </div>
    );
  } else {
    if (disabled) {
      content = <div className="value">{isMixed ? "—" : displayValue}</div>;
    } else {
      content = (
        <input
          className="value"
          value={displayValue}
          placeholder={isMixed ? "—" : undefined}
          onChange={(e) => onChangeValue(definition.id, e.target.value)}
          onDoubleClick={(e) => e.currentTarget.select()}
          onBlur={(e) => onBlurValue(definition.id, e.target.value)}
        />
      );
    }
  }

  return (
    <div
      className={`variable-box ${readonly ? "variable-readonly" : `variable-set-${value !== undefined && !isMixed}`} dropping-${dropping}`}
      onClick={(e) => onClick(definition.id, e)}
      draggable={draggable && !isMixed}
      onDragStart={_onDragStart}
      onDragOver={_onDragOver}
      onDragLeave={_onDragLeave}
      onDrop={_onDrop}
    >
      <TapToEditLabel
        className="name"
        value={definition.name}
        onChange={
          readonly || disabled || isBuiltin || ("type" in definition && definition.type === "stage")
            ? undefined
            : (name) => onChangeDefinition(definition.id, { name })
        }
      />
      {content}
    </div>
  );
};
