import React, { useState } from "react";

import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";

import { useDispatch } from "react-redux";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { DeepPartial } from "redux";
import { Actor, ActorTransform, Character, Global, RuleTreeItem, WorldMinimal } from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import { deleteCharacterVariable, upsertCharacter } from "../../actions/characters-actions";
import { changeActors } from "../../actions/stage-actions";
import { selectToolId } from "../../actions/ui-actions";
import { deleteGlobal, upsertGlobal } from "../../actions/world-actions";
import { TOOLS } from "../../constants/constants";
import { findRules, FindRulesResult, ruleUsesVariable } from "../../utils/stage-helpers";
import Sprite from "../sprites/sprite";
import { TransformEditorModal } from "./transform-editor";
import { TransformImages, TransformLabels } from "./transform-images";
import { VariableGridItem } from "./variable-grid-item";

type AppearanceGridItemProps = {
  spritesheet: Character["spritesheet"];
  actor: Actor;
  /** When undefined, shows placeholder (mixed values across multiple actors) */
  appearance: string | undefined;
  /** When undefined, shows placeholder (mixed values across multiple actors) */
  transform: ActorTransform | undefined;
  onChange: (appearanceId: string, transform: ActorTransform) => void;
};

const AppearanceGridItem = ({ actor, spritesheet, appearance, transform, onChange }: AppearanceGridItemProps) => {
  const [open, setOpen] = useState(false);
  const isMixedAppearance = appearance === undefined;
  const isMixedTransform = transform === undefined;

  const _onDragStart = (event: React.DragEvent) => {
    // Only allow dragging if we have consistent appearance values
    if (isMixedAppearance) {
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
      }),
    );
  };

  return (
    <div className={`variable-box variable-set-${!isMixedAppearance}`} draggable={!isMixedAppearance} onDragStart={_onDragStart}>
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
};

const PositionGridItem = ({ actor, coordinate, value, onChange }: PositionGridItemProps) => {
  const isMixed = value === undefined;

  const _onDragStart = (event: React.DragEvent) => {
    // Only allow dragging if we have a single consistent value
    if (isMixed) {
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
      }),
    );
  };

  return (
    <div className={`variable-box variable-set-${!isMixed}`} draggable={!isMixed} onDragStart={_onDragStart}>
      <div className="name">{coordinate === "x" ? "Horizontal" : "Vertical"}</div>
      <input
        type="number"
        value={isMixed ? "" : value}
        placeholder={isMixed ? "—" : undefined}
        onChange={(e) => {
          const num = Number(e.target.value);
          if (!isNaN(num)) onChange(num);
        }}
        style={{ width: "100%" }}
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
}: {
  character: Character;
  actor: Actor | null;
  actors?: Actor[];
  world: WorldMinimal;
}) => {
  const dispatch = useDispatch();
  const selectedToolId = useEditorSelector((state) => state.ui.selectedToolId);
  const selectedActors = useEditorSelector((state) => state.ui.selectedActors);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState>(null);

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

  function _renderCharacterSection() {
    const actorValues = actor ? actor.variableValues : {};

    return (
      <div className="variables-grid">
        {actor && (
          <>
            <AppearanceGridItem
              actor={actor}
              spritesheet={character.spritesheet}
              appearance={getCommonValue(actors, (a) => a.appearance)}
              transform={getCommonValue(actors, (a) => a.transform)}
              onChange={(appearance, transform) => {
                dispatch(changeActors(selectedActors!, { appearance, transform }));
              }}
            />
            <PositionGridItem
              actor={actor}
              coordinate="x"
              value={getCommonValue(actors, (a) => a.position.x)}
              onChange={(x) => {
                dispatch(changeActors(selectedActors!, { position: { ...actor.position, x } }));
              }}
            />
            <PositionGridItem
              actor={actor}
              coordinate="y"
              value={getCommonValue(actors, (a) => a.position.y)}
              onChange={(y) => {
                dispatch(changeActors(selectedActors!, { position: { ...actor.position, y } }));
              }}
            />
          </>
        )}
        {Object.values(character.variables).map((definition) => (
          <VariableGridItem
            disabled={selectedToolId !== TOOLS.POINTER}
            draggable={!!actor && selectedToolId === TOOLS.POINTER}
            actorId={actor ? actor.id : null}
            key={definition.id}
            definition={definition}
            value={actorValues[definition.id]}
            isMixed={isVariableValueMixed(actors, definition.id)}
            onClick={_onClickVar}
            onChangeDefinition={_onChangeVarDefinition}
            onChangeValue={_onChangeVarValue}
            onBlurValue={(id, value) => _onChangeVarValue(id, value)}
          />
        ))}
        {Object.values(character.variables).length === 0 && (
          <div className="empty">
            Add variables (like "age" or "health") that each {character.name} will have.
          </div>
        )}
      </div>
    );
  }

  function _renderWorldSection() {
    return (
      <div className="variables-grid">
        {Object.values(world.globals).map((definition) => (
          <VariableGridItem
            draggable={true}
            actorId={null}
            disabled={selectedToolId !== TOOLS.POINTER}
            key={definition.id}
            definition={definition}
            value={definition.value || ""}
            onClick={_onClickGlobal}
            onChangeDefinition={_onChangeGlobalDefinition}
            onChangeValue={(id, value) => _onChangeGlobalDefinition(id, { value })}
            onBlurValue={(id, value) => _onChangeGlobalDefinition(id, { value })}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`scroll-container`}>
      <div className="scroll-container-contents">
        {character ? (
          <div className="variables-section">
            <h3>
              {actors.length > 1
                ? `${character.name} (${actors.length} selected)`
                : actor
                  ? `${character.name} at (${actor.position.x},${actor.position.y})`
                  : `${character.name} (Defaults)`}
            </h3>
            {_renderCharacterSection()}
          </div>
        ) : (
          <div className="empty">Please select a character.</div>
        )}
        <div className="variables-section">
          <h3>World</h3>
          {_renderWorldSection()}
        </div>
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
  );
};
