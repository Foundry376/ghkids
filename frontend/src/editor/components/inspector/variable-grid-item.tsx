import { useEffect, useState } from "react";
import { Button } from "reactstrap";
import { useDraggableContainer } from "../../../hooks/useDraggableContainer";
import { useEditorSelector } from "../../../hooks/redux";
import { Character, Global, RandomRange, StageVariable } from "../../../types";
import {
  getStageVariableBooleanInEffect,
  isStageVariableValueValid,
} from "../../utils/builtin-stage-variables";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { inputModeForValue, isNumericValue } from "../../utils/variable-coercion";
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
 * "Turn" button + TransformEditorModal flow.
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
 * or "" doesn't surface to the engine. Spinner clicks land in onChange with an
 * already-valid integer and commit immediately; typing those same intermediate
 * states stays local until blur, where a clamp gives us back something the
 * engine can handle.
 *
 * A rule can also drop something that isn't a number at all into one of these
 * (a color, "NaN" from arithmetic on a word). A `type="number"` input renders
 * such a value as an empty box, which would hide the very thing the kid needs
 * to see, so we fall back to a text input and let the surrounding box flag it.
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
      type={isNumericValue(local) || local === "" ? "number" : "text"}
      inputMode="numeric"
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

/**
 * One end of a random variable's range, typed in place. Commits on blur or
 * Enter, and only a whole number: anything else puts the old bound back.
 */
const RandomBoundInput = ({
  value,
  label,
  disabled,
  onCommit,
}: {
  value: number;
  label: string;
  disabled: boolean;
  onCommit: (value: number) => void;
}) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const next = Math.floor(Number(text));
    if (text.trim() !== "" && Number.isFinite(next) && next !== value) {
      onCommit(next);
    }
    // Show the bound as stored. A new value arrives as a prop and replaces
    // this, but a commit can leave this bound unchanged (typing 8 into the
    // min of 5-5 stores 5-8), and then nothing else would reset the text.
    setText(String(value));
  };

  return (
    <input
      className="variable-random-bound"
      aria-label={label}
      title={label}
      inputMode="numeric"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
};

/**
 * The value row of a random variable's box: [min] roll [max]. The range is
 * part of the variable's definition (the character, level or world), so it's
 * editable whether or not an actor is selected. The roll is the engine's and
 * can't be typed in; with no actor selected there's no roll, so it's a die.
 */
const RandomVariableValue = ({
  range,
  roll,
  readonly,
  disabled,
  onChangeRange,
}: {
  range: RandomRange;
  /** The selected actor's roll, "—" for a mixed selection, or null for none. */
  roll: string | null;
  readonly: boolean;
  disabled: boolean;
  onChangeRange: (range: RandomRange) => void;
}) => {
  const rollContent =
    roll === null ? (
      <span role="img" aria-label="random">
        🎲
      </span>
    ) : (
      roll
    );
  if (readonly) {
    return (
      <div className="value variable-random-value">
        <span className="variable-random-bound">{range.min}</span>
        <span className="variable-random-roll">{rollContent}</span>
        <span className="variable-random-bound">{range.max}</span>
      </div>
    );
  }
  const setBound = (bound: "min" | "max", value: number) => {
    const next = { ...range, [bound]: value };
    onChangeRange({ min: Math.min(next.min, next.max), max: Math.max(next.min, next.max) });
  };
  return (
    <div className="value variable-random-value">
      <RandomBoundInput
        value={range.min}
        label="Lowest number"
        disabled={disabled}
        onCommit={(v) => setBound("min", v)}
      />
      <span className="variable-random-roll">{rollContent}</span>
      <RandomBoundInput
        value={range.max}
        label="Highest number"
        disabled={disabled}
        onCommit={(v) => setBound("max", v)}
      />
    </div>
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

  // Built-in level variables (Width, Wrap, Background…) have a required shape,
  // and rules can write anything into them. Reads coerce so the game keeps
  // running, which means the value on screen may not be the value in effect —
  // so say so here rather than letting the level quietly ignore it.
  const isInvalid =
    kind === "stageVariable" &&
    !isMixed &&
    !isStageVariableValueValid(definition as StageVariable, displayValue);

  const randomRange = "random" in definition ? definition.random : undefined;
  const randomScope =
    kind === "stageVariable" ? "level" : "defaultValue" in definition ? "character" : "world";
  // A character variable has no roll until an actor is selected: the
  // character itself only defines the variable.
  const randomRoll = isMixed
    ? "—"
    : randomScope === "character" && !actorId
      ? null
      : (displayValue ?? null);

  const [dropping, setDropping] = useState(false);
  const [valueOnFocus, setValueOnFocus] = useState<string | null>(null);
  const { containerProps } = useDraggableContainer();

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

  if (randomRange) {
    // The engine rolls a random variable at the start of every tick, so the
    // roll can't be typed in. (It used to be a text box: clicking it while
    // recording committed its value as a "Put 0 into Random" action that
    // pinned the roll every time the rule fired.)
    content = (
      <RandomVariableValue
        range={randomRange}
        roll={randomRoll}
        readonly={readonly}
        disabled={disabled}
        onChangeRange={(random) => onChangeDefinition(definition.id, { random })}
      />
    );
  } else if (readonly) {
    content = <div className="value">{isMixed ? "—" : displayValue}</div>;
  } else if (type === "boolean") {
    // Read through the same fallback the engine uses: an unusable value means
    // the stage is wrapping (the built-in default), and a checkbox that said
    // "Off" while the stage wrapped would be worse than the crash this
    // replaced.
    const checked = getStageVariableBooleanInEffect(definition as StageVariable, displayValue);
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
          inputMode={inputModeForValue(displayValue)}
          placeholder={isMixed ? "—" : undefined}
          onChange={(e) => onChangeValue(definition.id, e.target.value)}
          onDoubleClick={(e) => e.currentTarget.select()}
          onFocus={(e) => setValueOnFocus(e.target.value)}
          onBlur={(e) => {
            // Typing already saved each keystroke. Only commit on blur if the
            // text changed, so clicking into a box and back out doesn't pin
            // the value shown - while recording, that turned into a "Put"
            // action nobody asked for.
            if (e.target.value !== valueOnFocus) {
              onBlurValue(definition.id, e.target.value);
            }
          }}
        />
      );
    }
  }

  return (
    <div
      className={`variable-box ${randomRange ? "variable-random" : ""} ${readonly ? "variable-readonly" : `variable-set-${value !== undefined && !isMixed}`} dropping-${dropping} ${isInvalid ? "variable-invalid" : ""}`}
      title={
        isInvalid
          ? `"${displayValue}" can't be used for ${definition.name}, so the level is using its usual value instead.`
          : undefined
      }
      onClick={(e) => onClick(definition.id, e)}
      draggable={draggable && !isMixed && containerProps.draggable}
      onDragStart={_onDragStart}
      onDragOver={_onDragOver}
      onDragLeave={_onDragLeave}
      onDrop={_onDrop}
      onFocus={containerProps.onFocus}
      onBlur={containerProps.onBlur}
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
      {/* The die marks a random variable; with no roll to show, it's already
          in the middle of the box. */}
      {randomRange && randomRoll !== null && (
        <span
          className="variable-random-badge"
          title={`A new whole number from ${randomRange.min} to ${randomRange.max} every tick. ${
            {
              character: "Each character gets its own roll.",
              level: "The level gets one roll that every character sees.",
              world: "The world gets one roll that every character sees.",
            }[randomScope]
          }`}
        >
          🎲
        </span>
      )}
      {content}
    </div>
  );
};
