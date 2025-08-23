import { Character, Global } from "../../../types";
import { ConnectedActorBlock } from "../stage/recording/blocks";
import { TapToEditLabel } from "../tap-to-edit-label";
import ConnectedStagePicker from "./connected-stage-picker";

export const VariableGridItem = ({
  actorId,
  draggable,
  disabled,
  value,
  definition,
  onChangeDefinition,
  onBlurValue,
  onChangeValue,
  onClick,
}: {
  actorId: string | null;
  draggable: boolean;
  disabled: boolean;
  value: string;
  definition: Character["variables"][0] | Global;
  onChangeValue: (id: string, value: string | undefined) => void;
  onChangeDefinition: (id: string, partial: Partial<Character["variables"][0]>) => void;
  onBlurValue: (id: string, value: string | undefined) => void;
  onClick: (id: string, event: React.MouseEvent) => void;
}) => {
  const defaultValue = "defaultValue" in definition ? definition.defaultValue : undefined;
  const displayValue = value !== undefined ? value : defaultValue;

  const _onDragStart = (event: React.DragEvent) => {
    const displayValue = value !== undefined ? value : defaultValue;

    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify(
        actorId
          ? { actorId: actorId, variableId: definition.id, value: displayValue || "" }
          : { globalId: definition.id, value: displayValue || "" },
      ),
    );
  };

  let content = null;

  if ("type" in definition && definition.type === "stage") {
    content = (
      <ConnectedStagePicker
        value={`${displayValue}`}
        disabled={disabled}
        onChange={(e) => onChangeValue(definition.id, e.target.value)}
      />
    );
  } else if ("type" in definition && definition.type === "actor") {
    content = (
      <div className="value sprite">
        {displayValue && <ConnectedActorBlock actorId={displayValue} />}
      </div>
    );
  } else {
    if (disabled) {
      content = <div className="value">{displayValue}</div>;
    } else {
      content = (
        <input
          className="value"
          value={displayValue}
          onChange={(e) => onChangeValue(definition.id, e.target.value)}
          onDoubleClick={(e) => e.currentTarget.select()}
          onBlur={(e) => onBlurValue(definition.id, e.target.value)}
        />
      );
    }
  }

  return (
    <div
      className={`variable-box variable-set-${value !== undefined}`}
      onClick={(e) => onClick(definition.id, e)}
      draggable={draggable}
      onDragStart={_onDragStart}
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
