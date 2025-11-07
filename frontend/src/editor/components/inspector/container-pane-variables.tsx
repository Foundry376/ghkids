import React, { useState } from "react";

import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";

import { useDispatch, useSelector } from "react-redux";
import { Button } from "reactstrap";
import { DeepPartial } from "redux";
import {
  Actor,
  ActorSelection,
  Character,
  EditorState,
  Global,
  WorldMinimal,
} from "../../../types";
import { deleteCharacterVariable, upsertCharacter } from "../../actions/characters-actions";
import { changeActors } from "../../actions/stage-actions";
import { selectToolId } from "../../actions/ui-actions";
import { deleteGlobal, upsertGlobal } from "../../actions/world-actions";
import { TOOLS } from "../../constants/constants";
import { appearanceParts } from "../../utils/stage-helpers";
import Sprite from "../sprites/sprite";
import { TransformEditorModal } from "./transform-editor";
import { TransformImages, TransformLabels } from "./transform-images";
import { VariableGridItem } from "./variable-grid-item";

type AppeanceDropdownProps = {
  spritesheet: Character["spritesheet"];
  value: string;
  onChange: (appearanceId: string) => void;
};

const AppearanceGridItem = (props: {
  spritesheet: Character["spritesheet"];
  actor: Actor;
  onChange: (appearanceId: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  const _onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.dropEffect = "copy";
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(
      "variable",
      JSON.stringify({
        variableId: "appearance",
        actorId: props.actor.id,
        value: props.actor.appearance,
      }),
    );
  };

  return (
    <div className={`variable-box variable-set-true`} draggable onDragStart={_onDragStart}>
      <div className="name">Appearance</div>
      <AppearanceDropdown value={props.actor.appearance} {...props} />

      <div style={{ display: "flex", marginTop: 2 }}>
        <Button size="sm" style={{ width: 120 }} onClick={() => setOpen(true)}>
          Turn…
        </Button>
        <TransformEditorModal
          open={open}
          characterId={props.actor.characterId}
          value={props.actor.appearance}
          onChange={(value) => {
            setOpen(false);
            props.onChange(value);
          }}
        />
      </div>
    </div>
  );
};

export const AppearanceDropdown = ({ spritesheet, value, onChange }: AppeanceDropdownProps) => {
  const [open, setOpen] = useState(false);

  return (
    <ButtonDropdown size="sm" isOpen={open} toggle={() => setOpen(!open)}>
      <DropdownToggle caret>
        <Sprite spritesheet={spritesheet} appearance={value} fit />
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
  value: string;
  onChange: (value: string | undefined) => void;
  characterId?: string;
  displayAsLabel?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export const TransformDropdown = ({
  value,
  characterId,
  onChange,
  displayAsLabel,
  children,
  className,
}: TransformDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [, transform] = appearanceParts(value);

  return (
    <>
      <Button
        className={className}
        onClick={() => setOpen(true)}
        style={{ width: "100%", height: displayAsLabel ? 30 : 46 }}
      >
        {children || displayAsLabel ? TransformLabels[transform] : TransformImages[transform]}
      </Button>
      <TransformEditorModal
        open={open}
        characterId={characterId}
        value={value}
        onChange={(value) => {
          setOpen(false);
          onChange(value);
        }}
      />
    </>
  );
};

export const ContainerPaneVariables = ({
  character,
  actor,
  world,
}: {
  character: Character;
  actor: Actor | null;
  world: WorldMinimal;
}) => {
  const dispatch = useDispatch();
  const selectedToolId = useSelector<EditorState, TOOLS>((state) => state.ui.selectedToolId);
  const selectedActors = useSelector<EditorState, ActorSelection | null>(
    (state) => state.ui.selectedActors,
  );

  // Chararacter and actor variables

  const _onClickVar = (id: string, event: React.MouseEvent) => {
    if (selectedToolId === TOOLS.TRASH) {
      dispatch(deleteCharacterVariable(character.id, id));
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
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
          <AppearanceGridItem
            actor={actor}
            spritesheet={character.spritesheet}
            onChange={(appearance) => {
              dispatch(changeActors(selectedActors!, { appearance }));
            }}
          />
        )}
        {Object.values(character.variables).map((definition) => (
          <VariableGridItem
            disabled={selectedToolId !== TOOLS.POINTER}
            draggable={!!actor && selectedToolId === TOOLS.POINTER}
            actorId={actor ? actor.id : null}
            key={definition.id}
            definition={definition}
            value={actorValues[definition.id]}
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
              {actor
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
    </div>
  );
};
