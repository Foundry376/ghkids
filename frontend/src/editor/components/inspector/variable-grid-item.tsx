import { useState } from "react";
import { Character, Global } from "../../../types";
import { ConnectedActorBlock } from "../stage/recording/blocks";
import { TapToEditLabel } from "../tap-to-edit-label";
import ConnectedStagePicker from "./connected-stage-picker";

export const VariableGridItem = ({
  actorId,
  draggable,
  disabled,
  value,
  isMixed = false,
  definition,
  onChangeDefinition,
  onBlurValue,
  onChangeValue,
  onClick,
  reorderProps,
}: {
  actorId: string | null;
  draggable: boolean;
  disabled: boolean;
  value: string;
  /** When true, values differ across multiple selected actors */
  isMixed?: boolean;
  definition: Character["variables"][0] | Global;
  onChangeValue: (id: string, value: string | undefined) => void;
  onChangeDefinition: (id: string, partial: Partial<Character["variables"][0]>) => void;
  onBlurValue: (id: string, value: string | undefined) => void;
  onClick: (id: string, event: React.MouseEvent) => void;
  reorderProps?: {
    onDragStart: (event: React.DragEvent) => void;
    onDragOver: (event: React.DragEvent) => void;
    onDragLeave: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
    onDragEnd: (event: React.DragEvent) => void;
    "data-reorder-position"?: "before" | "after";
  };
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

  const [dropping, setDropping] = useState(false);

  const _onDragStart = (event: React.DragEvent) => {
    // Don't allow dragging if values are mixed
    if (isMixed) {
      event.preventDefault();
      return;
    }
    const isCharacterVar = "defaultValue" in definition;
    const canDragValue = !isCharacterVar || !!actorId;

    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copyMove";
    if (canDragValue) {
      const dragValue = value !== undefined ? value : defaultValue;
      event.dataTransfer.setData(
        "variable",
        JSON.stringify(
          actorId
            ? { actorId: actorId, variableId: definition.id, value: dragValue || "" }
            : { globalId: definition.id, value: dragValue || "" },
        ),
      );
    }
    reorderProps?.onDragStart(event);
  };

  const _onDragOver = (event: React.DragEvent) => {
    if (type === "actor" && event.dataTransfer.types.includes("sprite")) {
      event.preventDefault();
      setDropping(true);
      return;
    }
    reorderProps?.onDragOver(event);
  };

  const _onDragLeave = (event: React.DragEvent) => {
    setDropping(false);
    reorderProps?.onDragLeave(event);
  };

  const _onDrop = (event: React.DragEvent) => {
    if (type === "actor" && event.dataTransfer.types.includes("sprite")) {
      const { dragAnchorActorId } = JSON.parse(event.dataTransfer.getData("sprite"));
      onChangeValue(definition.id, dragAnchorActorId);
      event.preventDefault();
      event.stopPropagation();
      setDropping(false);
      return;
    }
    reorderProps?.onDrop(event);
    setDropping(false);
  };

  let content = null;

  if (type === "stage") {
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
      className={`variable-box variable-set-${value !== undefined && !isMixed} dropping-${dropping}`}
      onClick={(e) => onClick(definition.id, e)}
      draggable={draggable && !isMixed}
      onDragStart={_onDragStart}
      onDragOver={_onDragOver}
      onDragLeave={_onDragLeave}
      onDrop={_onDrop}
      onDragEnd={reorderProps?.onDragEnd}
      data-reorder-position={reorderProps?.["data-reorder-position"]}
    >
      <TapToEditLabel
        className="name"
        value={definition.name}
        onChange={
          disabled || ("type" in definition && definition.type === "stage")
            ? undefined
            : (name) => onChangeDefinition(definition.id, { name })
        }
      />
      {content}
    </div>
  );
};
