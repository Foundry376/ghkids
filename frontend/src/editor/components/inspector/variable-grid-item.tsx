import { useEffect, useState } from "react";
import { Button } from "reactstrap";
import { useEditorSelector } from "../../../hooks/redux";
import { Character, Global, StageVariable } from "../../../types";
import { getCurrentStageForWorld } from "../../utils/selectors";
import {
  BackgroundEditorModal,
  BackgroundPreview,
} from "../modal-stages/background-editor-modal";
import { ConnectedActorBlock } from "../stage/recording/blocks";
import { TapToEditLabel } from "../tap-to-edit-label";
import ConnectedStagePicker from "./connected-stage-picker";

/**
 * Editor for `type: "background"` stage variables — shows a small preview of
 * the current background and a Set… button that opens a modal picker
 * (color / explore tabs / custom URL). Pattern mirrors the AppearanceGridItem
 * "Turn…" button + TransformEditorModal flow.
 */
const BackgroundValueEditor = ({
  value,
  disabled,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  onCommit: (next: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const stageName = useEditorSelector((s) => getCurrentStageForWorld(s.world)?.name ?? "");
  return (
    <div className="value variable-background">
      <BackgroundPreview value={value} />
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{ flex: 1 }}
        title="Change background"
      >
        <i className="fa fa-pencil" />
      </Button>
      <BackgroundEditorModal
        open={open}
        value={value}
        stageName={stageName}
        onChange={(next) => {
          setOpen(false);
          if (next !== value) onCommit(next);
        }}
      />
    </div>
  );
};

/**
 * Editor for `type: "number"` stage variables. Uses a controlled value backed
 * by local state so that in-progress typing of intermediate states like "0"
 * or "" doesn't surface to the engine (which throws on non-positive
 * dimensions). Spinner clicks land in onChange with an already-valid integer
 * and commit immediately; typing those same intermediate states stays local
 * until blur, where a clamp gives us back something the engine can handle.
 */
const NumberValueEditor = ({
  value,
  disabled,
  isMixed,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  isMixed: boolean;
  onCommit: (next: string) => void;
}) => {
  const [local, setLocal] = useState(value);
  useEffect(() => {
    setLocal(value);
  }, [value]);

  const clamp = (raw: string): string => {
    const n = Math.max(1, Math.floor(Number(raw)));
    return Number.isFinite(n) ? String(n) : value;
  };

  return (
    <input
      className="value"
      type="number"
      min={1}
      step={1}
      value={local}
      disabled={disabled}
      placeholder={isMixed ? "—" : undefined}
      onChange={(e) => {
        const raw = e.target.value;
        setLocal(raw);
        const n = Number(raw);
        if (Number.isInteger(n) && n >= 1) {
          onCommit(String(n));
        }
      }}
      onBlur={(e) => {
        const next = clamp(e.target.value);
        onCommit(next);
        setLocal(next);
      }}
    />
  );
};

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

  const isBuiltin =
    "type" in definition &&
    (definition.type === "boolean" ||
      definition.type === "number" ||
      definition.type === "background");

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
  } else if (type === "number") {
    content = (
      <NumberValueEditor
        value={String(displayValue ?? "")}
        disabled={disabled}
        isMixed={isMixed}
        onCommit={(v) => onChangeValue(definition.id, v)}
      />
    );
  } else if (type === "background") {
    content = (
      <BackgroundValueEditor
        value={String(displayValue ?? "")}
        disabled={disabled}
        onCommit={(v) => onChangeValue(definition.id, v)}
      />
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
