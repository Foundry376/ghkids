import React, { useState } from "react";


import { useDispatch } from "react-redux";
import { Button, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle, Modal, ModalBody, ModalFooter, ModalHeader, Nav, NavItem, NavLink } from "reactstrap";
import { DeepPartial } from "redux";
import { Actor, ActorTransform, Character, Global, RuleTreeItem, StageVariable, WorldMinimal } from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import {
  deleteCharacterVariable,
  setCharacterVariablePositions,
  upsertCharacter,
} from "../../actions/characters-actions";
import { changeActors } from "../../actions/stage-actions";
import { selectToolId } from "../../actions/ui-actions";
import {
  deleteGlobal,
  deleteStageVariable,
  setGlobalPositions,
  setStageVariablePositions,
  setStageVariableValue,
  upsertGlobal,
  upsertStageVariable,
} from "../../actions/world-actions";
import { TOOLS } from "../../constants/constants";
import { getCurrentStageForWorld } from "../../utils/selectors";
import { findRules, FindRulesResult, ruleUsesVariable } from "../../utils/stage-helpers";
import { isBuiltinStageVariableId } from "../../utils/builtin-stage-variables";
import {
  beginVariableDrag,
  CHARACTER_BUILTIN_VARIABLE_IDS,
  CHARACTER_CELL_HEIGHT,
} from "../../utils/variable-layout";
import Sprite from "../sprites/sprite";
import AddVariableButton, { VariablesSubTab } from "./add-variable-button";
import { TransformEditorModal } from "./transform-editor";
import { VariableCanvas } from "./variable-canvas";
import { TransformImages, TransformLabels } from "./transform-images";
import { VariableGridItem } from "./variable-grid-item";

const ReadonlyGridItem = ({
  name,
  value,
  style,
}: {
  name: string;
  value: string | number | undefined;
  style?: React.CSSProperties;
}) => (
  <div className="variable-box variable-readonly" style={style}>
    <div className="name">{name}</div>
    <div className="value">{value !== undefined ? String(value) : "—"}</div>
  </div>
);

const ReadonlyAppearanceGridItem = ({
  spritesheet,
  appearance,
  style,
}: {
  spritesheet: Character["spritesheet"];
  appearance: string | undefined;
  style?: React.CSSProperties;
}) => (
  <div className="variable-box variable-readonly" draggable={false} style={style}>
    <div className="name">Appearance</div>
    <div className="value" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {appearance !== undefined ? (
        <Sprite spritesheet={spritesheet} appearance={appearance} fit />
      ) : (
        "—"
      )}
    </div>
  </div>
);

type AppearanceGridItemProps = {
  spritesheet: Character["spritesheet"];
  actor: Actor;
  /** When undefined, shows placeholder (mixed values across multiple actors) */
  appearance: string | undefined;
  /** When undefined, shows placeholder (mixed values across multiple actors) */
  transform: ActorTransform | undefined;
  onChange: (appearanceId: string, transform: ActorTransform) => void;
  draggable?: boolean;
  style?: React.CSSProperties;
};

const AppearanceGridItem = ({ actor, spritesheet, appearance, transform, onChange, draggable = true, style }: AppearanceGridItemProps) => {
  const [open, setOpen] = useState(false);
  const isMixedAppearance = appearance === undefined;
  const isMixedTransform = transform === undefined;
  const canDrag = draggable && !isMixedAppearance;

  const _onDragStart = (event: React.DragEvent) => {
    // Only allow dragging if we have consistent appearance values
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify({
        variableId: "appearance",
        actorId: actor.id,
        value: appearance,
        // Lets the arrangement canvas treat this as a movable "appearance" box.
        reorderKind: "actor",
        reorderId: "appearance",
      }),
    );
    const rect = event.currentTarget.getBoundingClientRect();
    beginVariableDrag({
      id: "appearance",
      kind: "actor",
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  return (
    <div className={`variable-box variable-set-${!isMixedAppearance}`} style={style} draggable={canDrag} onDragStart={_onDragStart} onDragEnd={() => beginVariableDrag(null)}>
      <div className="name">Appearance</div>
      {isMixedAppearance ? (
        <Button size="sm" style={{ width: "100%", opacity: 0.5 }} disabled>
          —
        </Button>
      ) : (
        <AppearanceDropdown
          appearance={appearance}
          transform={transform}
          spritesheet={spritesheet}
          onChange={(newAppearance) => onChange(newAppearance, transform ?? "0")}
        />
      )}
      <div style={{ display: "flex", marginTop: 2 }}>
        <Button size="sm" style={{ width: 120 }} onClick={() => setOpen(true)} disabled={isMixedAppearance && isMixedTransform}>
          Turn…
        </Button>
        {!isMixedAppearance && (
          <TransformEditorModal
            open={open}
            appearance={appearance}
            characterId={actor.characterId}
            value={transform ?? "0"}
            onChange={(value) => {
              setOpen(false);
              onChange(appearance, value);
            }}
          />
        )}
      </div>
    </div>
  );
};

type AppeanceDropdownProps = {
  spritesheet: Character["spritesheet"];
  appearance: string;
  transform?: ActorTransform;
  onChange: (appearanceId: string) => void;
};

export const AppearanceDropdown = ({
  spritesheet,
  appearance,
  onChange,
}: AppeanceDropdownProps) => {
  const [open, setOpen] = useState(false);

  return (
    <ButtonDropdown size="sm" isOpen={open} toggle={() => setOpen(!open)}>
      <DropdownToggle caret>
        <Sprite spritesheet={spritesheet} appearance={appearance} fit />
      </DropdownToggle>
      <DropdownMenu className="with-sprites" container="body">
        {Object.keys(spritesheet.appearances).map((id) => (
          <DropdownItem onClick={() => onChange(id)} key={id}>
            <Sprite spritesheet={spritesheet} appearance={id} fit />
          </DropdownItem>
        ))}
      </DropdownMenu>
    </ButtonDropdown>
  );
};

type TransformDropdownProps = {
  value: Actor["transform"];
  onChange: (value: Actor["transform"] | undefined) => void;
  characterId?: string;
  appearance?: string;
  displayAsLabel?: boolean;
};

export const TransformDropdown = ({
  value,
  characterId,
  appearance,
  onChange,
  displayAsLabel,
}: TransformDropdownProps) => {
  const [open, setOpen] = useState(false);
  const transform = value || "0";

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        style={{ width: "100%", height: displayAsLabel ? 30 : 46 }}
      >
        {displayAsLabel ? TransformLabels[transform] : TransformImages[transform]}
      </Button>
      <TransformEditorModal
        open={open}
        characterId={characterId}
        appearance={appearance}
        value={transform}
        onChange={(value) => {
          setOpen(false);
          onChange(value);
        }}
      />
    </>
  );
};

type PositionGridItemProps = {
  actor: Actor;
  coordinate: "x" | "y";
  /** When undefined, shows empty input (mixed values across multiple actors) */
  value: number | undefined;
  onChange: (value: number) => void;
  draggable?: boolean;
  style?: React.CSSProperties;
};

const PositionGridItem = ({ actor, coordinate, value, onChange, draggable = true, style }: PositionGridItemProps) => {
  const isMixed = value === undefined;
  const canDrag = draggable && !isMixed;

  const _onDragStart = (event: React.DragEvent) => {
    // Only allow dragging if we have a single consistent value
    if (!canDrag) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify({
        variableId: coordinate,
        actorId: actor.id,
        value: String(value),
        // Lets the arrangement canvas treat this as a movable "x"/"y" box.
        reorderKind: "actor",
        reorderId: coordinate,
      }),
    );
    const rect = event.currentTarget.getBoundingClientRect();
    beginVariableDrag({
      id: coordinate,
      kind: "actor",
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    });
  };

  return (
    <div className={`variable-box variable-set-${!isMixed}`} style={style} draggable={canDrag} onDragStart={_onDragStart} onDragEnd={() => beginVariableDrag(null)}>
      <div className="name">{coordinate === "x" ? "Horizontal" : "Vertical"}</div>
      <input
        className="value"
        type="number"
        value={isMixed ? "" : value}
        placeholder={isMixed ? "—" : undefined}
        onChange={(e) => {
          const num = Number(e.target.value);
          if (!isNaN(num)) onChange(num);
        }}
      />
    </div>
  );
};

type VariableInUseModalProps = {
  variableName: string;
  rulesUsingVariable: FindRulesResult;
  onConfirm: () => void;
  onCancel: () => void;
};

const VariableInUseModal = ({
  variableName,
  rulesUsingVariable,
  onConfirm,
  onCancel,
}: VariableInUseModalProps) => {
  const getRuleName = (rule: RuleTreeItem): string => {
    if ("name" in rule) return rule.name;
    return rule.id;
  };

  return (
    <Modal isOpen toggle={onCancel}>
      <ModalHeader toggle={onCancel}>Variable In Use</ModalHeader>
      <ModalBody>
        <p>
          The variable "{variableName}" is used in{" "}
          {rulesUsingVariable.length === 1
            ? "1 rule"
            : `${rulesUsingVariable.length} rules`}
          . Deleting it may cause unexpected behavior.
        </p>
        <p>Rules using this variable:</p>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {rulesUsingVariable.map(({ rule }) => (
            <li key={rule.id}>{getRuleName(rule)}</li>
          ))}
        </ul>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="danger" onClick={onConfirm}>
          Delete Anyway
        </Button>
      </ModalFooter>
    </Modal>
  );
};

type PendingDeleteState = {
  variableId: string;
  variableName: string;
  rulesUsingVariable: FindRulesResult;
} | null;

/**
 * Returns the common value across all actors for a given accessor, or undefined if values differ.
 */
function getCommonValue<T>(actors: Actor[], getValue: (actor: Actor) => T): T | undefined {
  if (actors.length === 0) return undefined;
  const firstValue = getValue(actors[0]!);
  const allSame = actors.every((a) => getValue(a) === firstValue);
  return allSame ? firstValue : undefined;
}

/**
 * Checks if a variable value is mixed across multiple actors.
 * Returns true if actors have different values for the variable.
 */
function isVariableValueMixed(actors: Actor[], variableId: string): boolean {
  if (actors.length <= 1) return false;
  const firstValue = actors[0]!.variableValues[variableId];
  return !actors.every((a) => a.variableValues[variableId] === firstValue);
}

export const ContainerPaneVariables = ({
  character,
  actor,
  actors = [],
  world,
  readonly = false,
}: {
  character: Character;
  actor: Actor | null;
  actors?: Actor[];
  world: WorldMinimal;
  readonly?: boolean;
}) => {
  const dispatch = useDispatch();
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const selectedActors = useEditorSelector((state) => state.ui.selectedActors);
  const recording = useEditorSelector((state) => state.recording);
  const isRecording = !!recording.characterId;
  // During recording, Level edits should land on the after world so they
  // become rule actions; otherwise they edit the live game state directly.
  const levelTargetWorld = isRecording ? recording.afterWorld : world;
  const levelTargetStage = getCurrentStageForWorld(levelTargetWorld);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState>(null);
  const [subTab, setSubTab] = useState<VariablesSubTab>("character");

  // Chararacter and actor variables

  const _onClickVar = (id: string, event: React.MouseEvent) => {
    if (selectedToolId === TOOLS.TRASH) {
      // Check if this variable is used in any rules
      const rulesUsingVariable = findRules(character, ruleUsesVariable(id));

      if (rulesUsingVariable.length > 0) {
        // Show confirmation dialog instead of deleting
        const variableName = character.variables[id]?.name || "Untitled";
        setPendingDelete({ variableId: id, variableName, rulesUsingVariable });
      } else {
        // No rules use this variable, safe to delete
        dispatch(deleteCharacterVariable(character.id, id));
      }

      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  const _onConfirmDelete = () => {
    if (pendingDelete) {
      dispatch(deleteCharacterVariable(character.id, pendingDelete.variableId));
      setPendingDelete(null);
    }
  };

  const _onCancelDelete = () => {
    setPendingDelete(null);
  };

  const _onChangeVarDefinition = (id: string, changes: Partial<Character["variables"][0]>) => {
    dispatch(
      upsertCharacter(character.id, {
        variables: {
          [id]: changes,
        },
      }),
    );
  };

  const _onChangeVarValue = (id: string, value: string | undefined) => {
    if (!selectedActors) {
      _onChangeVarDefinition(id, { defaultValue: value });
      return;
    }
    dispatch(
      changeActors(selectedActors, {
        variableValues: {
          [id]: value,
        },
      }),
    );
  };

  // Globals

  const _onChangeGlobalDefinition = (globalId: string, changes: DeepPartial<Global>) => {
    dispatch(upsertGlobal(world.id, globalId, changes));
  };

  const _onClickGlobal = (globalId: string, event: React.MouseEvent) => {
    if (selectedToolId === TOOLS.TRASH) {
      dispatch(deleteGlobal(world.id, globalId));
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  // Stage variables — definitions are world-scoped but values are per-stage.
  // The right-panel section reads/writes the currently-selected stage's value.

  const _onRenameStageVariable = (stageVariableId: string, changes: Partial<StageVariable>) => {
    // Only `name` is editable here; values live on the stage, not the definition.
    if ("name" in changes) {
      dispatch(upsertStageVariable(world.id, stageVariableId, { name: changes.name }));
    }
  };

  const _onChangeStageVariableValue = (stageVariableId: string, value: string | undefined) => {
    if (!levelTargetStage) return;
    dispatch(
      setStageVariableValue(levelTargetWorld.id, levelTargetStage.id, stageVariableId, value),
    );
  };

  const _onClickStageVariable = (stageVariableId: string, event: React.MouseEvent) => {
    if (selectedToolId === TOOLS.TRASH) {
      dispatch(deleteStageVariable(world.id, stageVariableId));
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  function _renderCharacterItem(id: string, style: React.CSSProperties) {
    if (id === "appearance") {
      return readonly ? (
        <ReadonlyAppearanceGridItem
          style={style}
          spritesheet={character.spritesheet}
          appearance={getCommonValue(actors, (a) => a.appearance)}
        />
      ) : (
        <AppearanceGridItem
          style={style}
          draggable={!readonly && selectedToolId === TOOLS.POINTER}
          actor={actor!}
          spritesheet={character.spritesheet}
          appearance={getCommonValue(actors, (a) => a.appearance)}
          transform={getCommonValue(actors, (a) => a.transform)}
          onChange={(appearance, transform) => {
            dispatch(changeActors(selectedActors!, { appearance, transform }));
          }}
        />
      );
    }
    if (id === "x" || id === "y") {
      const value = getCommonValue(actors, (a) => a.position[id]);
      return readonly ? (
        <ReadonlyGridItem style={style} name={id === "x" ? "Horizontal" : "Vertical"} value={value} />
      ) : (
        <PositionGridItem
          style={style}
          draggable={!readonly && selectedToolId === TOOLS.POINTER}
          actor={actor!}
          coordinate={id}
          value={value}
          onChange={(v) => {
            dispatch(changeActors(selectedActors!, { position: { ...actor!.position, [id]: v } }));
          }}
        />
      );
    }
    const definition = character.variables[id];
    const actorValues = actor ? actor.variableValues : {};
    return (
      <VariableGridItem
        style={style}
        disabled={selectedToolId !== TOOLS.POINTER}
        readonly={readonly}
        draggable={!!actor && selectedToolId === TOOLS.POINTER}
        actorId={actor ? actor.id : null}
        definition={definition}
        value={actorValues[definition.id]}
        isMixed={isVariableValueMixed(actors, definition.id)}
        onClick={_onClickVar}
        onChangeDefinition={_onChangeVarDefinition}
        onChangeValue={_onChangeVarValue}
        onBlurValue={(varId, value) => _onChangeVarValue(varId, value)}
      />
    );
  }

  function _renderCharacterSection() {
    const layout = character.variableLayout ?? {};
    // Moving boxes reuses the per-actor drag, so it follows the same gate as
    // dragging a character variable: an actor must be selected with the pointer.
    const canMove = !readonly && !!actor && selectedToolId === TOOLS.POINTER;

    // With an actor selected, show the Appearance/position pseudo-boxes at
    // their saved cells alongside the variables. In the non-interactive
    // "Defaults" view (no actor) those boxes don't exist, so compact the
    // variables to the top instead of leaving holes where they'd sit.
    const items = actor
      ? [...CHARACTER_BUILTIN_VARIABLE_IDS, ...Object.keys(character.variables)].map((id) => ({
          id,
          position: layout[id],
        }))
      : Object.keys(character.variables).map((id) => ({ id }));

    return (
      <>
        <VariableCanvas
          items={items}
          kind="actor"
          enabled={canMove}
          cellHeight={CHARACTER_CELL_HEIGHT}
          onMove={(positions) => dispatch(setCharacterVariablePositions(character.id, positions))}
          renderItem={_renderCharacterItem}
        />
        {Object.keys(character.variables).length === 0 && (
          <div className="empty">
            Add variables (like "age" or "health") that each {character.name} will have.
          </div>
        )}
      </>
    );
  }

  function _renderGlobal(definition: Global, style?: React.CSSProperties) {
    return (
      <VariableGridItem
        style={style}
        draggable={true}
        kind="global"
        actorId={null}
        disabled={selectedToolId !== TOOLS.POINTER}
        readonly={readonly}
        definition={definition}
        value={definition.value || ""}
        onClick={_onClickGlobal}
        onChangeDefinition={_onChangeGlobalDefinition}
        onChangeValue={(id, value) => _onChangeGlobalDefinition(id, { value })}
        onBlurValue={(id, value) => _onChangeGlobalDefinition(id, { value })}
      />
    );
  }

  function _renderWorldSection() {
    return (
      <VariableCanvas
        items={Object.values(world.globals)}
        kind="global"
        enabled={!readonly && selectedToolId === TOOLS.POINTER}
        onMove={(positions) => dispatch(setGlobalPositions(world.id, positions))}
        renderItem={(id, style) => _renderGlobal(world.globals[id], style)}
      />
    );
  }

  function _renderStageVariable(definition: StageVariable, style?: React.CSSProperties) {
    const values = levelTargetStage ? levelTargetStage.variableValues : {};
    return (
      <VariableGridItem
        style={style}
        draggable={true}
        actorId={null}
        kind="stageVariable"
        disabled={selectedToolId !== TOOLS.POINTER}
        readonly={readonly}
        definition={definition}
        value={values[definition.id] ?? ""}
        onClick={_onClickStageVariable}
        onChangeDefinition={_onRenameStageVariable}
        onChangeValue={_onChangeStageVariableValue}
        onBlurValue={_onChangeStageVariableValue}
      />
    );
  }

  function _renderLevelSection() {
    const defs = Object.values(world.stageVariables);
    const userCount = defs.filter((d) => !isBuiltinStageVariableId(d.id)).length;
    return (
      <>
        <VariableCanvas
          items={defs}
          kind="stageVariable"
          enabled={!readonly && selectedToolId === TOOLS.POINTER}
          onMove={(positions) => dispatch(setStageVariablePositions(world.id, positions))}
          renderItem={(id, style) => _renderStageVariable(world.stageVariables[id], style)}
        />
        {userCount === 0 && (
          <div className="empty">
            Add a Level Variable (like "difficulty") that every Level has, with values set per Level.
          </div>
        )}
      </>
    );
  }

  // The Character pill carries the selection context (which actor / how many)
  // that used to live in an in-panel header above the variable boxes.
  const characterLabel = character
    ? actors.length > 1
      ? `${character.name} (${actors.length} selected)`
      : actor
        ? `${character.name} at (${actor.position.x},${actor.position.y})`
        : `${character.name} (Defaults)`
    : "Character";

  return (
    <>
      <div className="inspector-subnav">
        <Nav pills className="inspector-subnav-pills">
          <NavItem>
            <NavLink active={subTab === "character"} onClick={() => setSubTab("character")}>
              {characterLabel}
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink active={subTab === "level"} onClick={() => setSubTab("level")}>
              Level
            </NavLink>
          </NavItem>
          <NavItem>
            <NavLink active={subTab === "world"} onClick={() => setSubTab("world")}>
              World
            </NavLink>
          </NavItem>
        </Nav>
        <AddVariableButton character={character} section={subTab} />
      </div>
      <div className={`scroll-container variables-pane`}>
        <div className="scroll-container-contents">
          {subTab === "character" &&
            (character ? (
              <div className="variables-section">{_renderCharacterSection()}</div>
            ) : (
              <div className="empty">Please select a character.</div>
            ))}
          {subTab === "level" && (
            <div className="variables-section">{_renderLevelSection()}</div>
          )}
          {subTab === "world" && (
            <div className="variables-section">{_renderWorldSection()}</div>
          )}
        </div>

        {pendingDelete && (
          <VariableInUseModal
            variableName={pendingDelete.variableName}
            rulesUsingVariable={pendingDelete.rulesUsingVariable}
            onConfirm={_onConfirmDelete}
            onCancel={_onCancelDelete}
          />
        )}
      </div>
    </>
  );
};
