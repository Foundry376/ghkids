import { Button, ButtonDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import classNames from "classnames";
import React, { useCallback, useState } from "react";
import { useDispatch } from "react-redux";


import { MODALS, TOOLS } from "../constants/constants";

import {
  changeCharacterAppearanceName,
  createCharacter,
  createCharacterAppearance,
  createDoorCharacter,
  deleteCharacter,
  deleteCharacterAppearance,
  setAppearanceOrder,
  setCharacterZOrder,
  upsertCharacter,
} from "../actions/characters-actions";
import { useReorderableList } from "../hooks/use-reorderable-list";

import { setupRecordingForCharacter } from "../actions/recording-actions";

import {
  paintCharacterAppearance,
  select,
  selectToolId,
  selectToolItem,
  showModal,
} from "../actions/ui-actions";

import { Character } from "../../types";
import { useEditorSelector } from "../../hooks/redux";
import { defaultAppearanceId } from "../utils/character-helpers";
import { makeId } from "../utils/utils";
import Sprite from "./sprites/sprite";
import { TapToEditLabel } from "./tap-to-edit-label";

interface LibraryItemProps {
  character: Character;
  label: string;
  labelEditable?: boolean;
  onChangeLabel: (value: string) => void;
  selected?: boolean;
  outlined?: boolean;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: () => void;
  dragType?: string;
  appearance?: string;
  reorderProps?: {
    onDragStart: (event: React.DragEvent) => void;
    onDragOver: (event: React.DragEvent) => void;
    onDragLeave: (event: React.DragEvent) => void;
    onDrop: (event: React.DragEvent) => void;
    onDragEnd: (event: React.DragEvent) => void;
    "data-reorder-position"?: "before" | "after";
  };
}

const LibraryItem: React.FC<LibraryItemProps> = ({
  character,
  label,
  labelEditable,
  onChangeLabel,
  selected,
  outlined,
  onClick,
  onDoubleClick,
  dragType,
  appearance,
  reorderProps,
}) => {
  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.dropEffect = "copy";
      event.dataTransfer.effectAllowed = "copyMove";

      const el = event.target as HTMLElement;
      const { top, left } = el.getBoundingClientRect();
      const offset = {
        dragLeft: event.clientX - left,
        dragTop: event.clientY - top,
      };

      const img = new Image();
      const imgEl = (el.tagName === "IMG" ? el : el.querySelector("img")) as HTMLImageElement;
      img.src = imgEl?.src || "";
      event.dataTransfer.setDragImage(img, offset.dragLeft, offset.dragTop);

      event.dataTransfer.setData("drag-offset", JSON.stringify(offset));
      if (dragType) {
        event.dataTransfer.setData(
          dragType,
          JSON.stringify({
            characterId: character.id,
            appearance: appearance,
          }),
        );
      }
      reorderProps?.onDragStart(event);
    },
    [character.id, appearance, dragType, reorderProps],
  );

  const { spritesheet } = character;

  return (
    <div
      className={classNames({ item: true, selected: selected })}
      draggable={labelEditable}
      onDragStart={onDragStart}
      onDragOver={reorderProps?.onDragOver}
      onDragLeave={reorderProps?.onDragLeave}
      onDrop={reorderProps?.onDrop}
      onDragEnd={reorderProps?.onDragEnd}
      data-reorder-position={reorderProps?.["data-reorder-position"]}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <Sprite
        className={`${outlined ? "outlined" : ""}`}
        spritesheet={spritesheet}
        frame={0}
        appearance={appearance || defaultAppearanceId(spritesheet)}
        fit
      />
      <TapToEditLabel
        className="name"
        value={label}
        onChange={labelEditable ? onChangeLabel : undefined}
      />
    </div>
  );
};

const RECORDING_DELETE_CHARACTER = `Please exit the recording before deleting characters.`;
const CONFIRM_DELETE_CHARACTER = `Are you sure you want to delete this character? If this character appears in other rules, they'll be removed.`;

export const Library: React.FC = () => {
  const dispatch = useDispatch();
  const characters = useEditorSelector((s) => s.characters);
  const characterZOrder = useEditorSelector((s) => s.characterZOrder);
  const ui = useEditorSelector((s) => s.ui);
  const recordingActorId = useEditorSelector((s) => s.recording.actorId);

  const [characterDropdownOpen, setCharacterDropdownOpen] = useState(false);

  const onClickCharacter = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, characterId: string) => {
      if (ui.selectedToolId === TOOLS.TRASH) {
        if (recordingActorId) {
          window.alert(RECORDING_DELETE_CHARACTER);
          return;
        }
        if (window.confirm(CONFIRM_DELETE_CHARACTER)) {
          dispatch(deleteCharacter(characterId));
        }
        if (!event.shiftKey) {
          dispatch(selectToolId(TOOLS.POINTER));
        }
      } else if (ui.selectedToolId === TOOLS.STAMP) {
        dispatch(selectToolItem({ characterId }));
      } else if (ui.selectedToolId === TOOLS.PAINT) {
        const character = characters[characterId];
        dispatch(paintCharacterAppearance(characterId, defaultAppearanceId(character.spritesheet)));
        dispatch(selectToolId(TOOLS.POINTER));
      } else if (ui.selectedToolId === TOOLS.RECORD) {
        dispatch(setupRecordingForCharacter({ characterId }));
        dispatch(selectToolId(TOOLS.POINTER));
      } else {
        dispatch(select(characterId, null));
      }
    },
    [ui.selectedToolId, recordingActorId, dispatch, characters],
  );

  const onClickAppearance = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, characterId: string, appearanceId: string) => {
      if (ui.selectedToolId === TOOLS.TRASH) {
        dispatch(deleteCharacterAppearance(characterId, appearanceId));
        if (!event.shiftKey) {
          dispatch(selectToolId(TOOLS.POINTER));
        }
      } else if (ui.selectedToolId === TOOLS.STAMP) {
        dispatch(selectToolItem({ characterId, appearanceId }));
      } else if (ui.selectedToolId === TOOLS.PAINT) {
        dispatch(paintCharacterAppearance(characterId, appearanceId));
        dispatch(selectToolId(TOOLS.POINTER));
      }
    },
    [ui.selectedToolId, dispatch],
  );

  const onClickCharactersBackground = (event: React.MouseEvent<unknown>) => {
    if (
      ui.selectedToolId === TOOLS.STAMP &&
      ui.stampToolItem &&
      "characterId" in ui.stampToolItem
    ) {
      const existing = characters[ui.stampToolItem.characterId];
      const newCharacterId = makeId("character");
      dispatch(upsertCharacter(newCharacterId, { ...existing, name: `${existing.name} Copy` }));
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  const onClickAppearancesBackground = (event: React.MouseEvent<unknown>) => {
    if (
      ui.selectedToolId === TOOLS.STAMP &&
      ui.stampToolItem &&
      "appearanceId" in ui.stampToolItem
    ) {
      const character = ui.selectedCharacterId ? characters[ui.selectedCharacterId] : null;
      if (!character) return;

      const newAppearanceId = makeId("appearance");
      const newAppearanceData = character.spritesheet.appearances[ui.stampToolItem.appearanceId][0];
      dispatch(createCharacterAppearance(character.id, newAppearanceId, newAppearanceData));
      if (!event.shiftKey) {
        dispatch(selectToolId(TOOLS.POINTER));
      }
    }
  };

  const charactersOrdered =
    characterZOrder.length > 0
      ? characterZOrder.filter((id) => characters[id])
      : Object.keys(characters);

  const charactersReorder = useReorderableList({
    kind: "character",
    order: charactersOrdered,
    onReorder: (newOrder) => dispatch(setCharacterZOrder(newOrder)),
  });

  const selectedCharacter = ui.selectedCharacterId ? characters[ui.selectedCharacterId] : null;
  const appearanceIds = selectedCharacter
    ? Object.keys(selectedCharacter.spritesheet.appearances)
    : [];

  const appearancesReorder = useReorderableList({
    kind: "appearance",
    order: appearanceIds,
    onReorder: (newOrder) => {
      if (selectedCharacter) dispatch(setAppearanceOrder(selectedCharacter.id, newOrder));
    },
  });

  const renderCharactersPanel = () => {
    return (
      <div className="item-grid" onClick={onClickCharactersBackground}>
        {charactersOrdered.map((id) => (
          <LibraryItem
            key={id}
            dragType="sprite"
            character={characters[id]}
            label={characters[id].name}
            labelEditable={ui.selectedToolId === TOOLS.POINTER}
            onChangeLabel={(name) => dispatch(upsertCharacter(id, { name }))}
            onClick={(event) => onClickCharacter(event, id)}
            selected={id === ui.selectedCharacterId}
            outlined={id === ui.selectedCharacterId && !ui.selectedActors}
            reorderProps={
              ui.selectedToolId === TOOLS.POINTER
                ? charactersReorder.getItemProps(id)
                : undefined
            }
          />
        ))}
      </div>
    );
  };

  const renderAppearancesPanel = () => {
    if (!selectedCharacter) {
      return <div className="empty">Select an actor in your library to view it's appearances.</div>;
    }

    return (
      <div className="item-grid" onClick={onClickAppearancesBackground}>
        {appearanceIds.map((appearanceId) => (
          <LibraryItem
            key={appearanceId}
            character={selectedCharacter}
            appearance={appearanceId}
            dragType="appearance"
            label={selectedCharacter.spritesheet.appearanceNames[appearanceId]}
            labelEditable={ui.selectedToolId === TOOLS.POINTER}
            onDoubleClick={() =>
              dispatch(paintCharacterAppearance(selectedCharacter.id, appearanceId))
            }
            onClick={(event) => onClickAppearance(event, selectedCharacter.id, appearanceId)}
            onChangeLabel={(value) =>
              dispatch(changeCharacterAppearanceName(selectedCharacter.id, appearanceId, value))
            }
            reorderProps={
              ui.selectedToolId === TOOLS.POINTER
                ? appearancesReorder.getItemProps(appearanceId)
                : undefined
            }
          />
        ))}
      </div>
    );
  };

  const onCreateCharacter = useCallback(() => {
    const newCharacterId = makeId("character");
    dispatch(createCharacter(newCharacterId));
    dispatch(paintCharacterAppearance(newCharacterId, "idle"));
  }, [dispatch]);

  const onCreateDoor = useCallback(() => {
    const newCharacterId = makeId("character");
    dispatch(createDoorCharacter(newCharacterId));
  }, [dispatch]);

  const onExploreCharacters = useCallback(() => {
    dispatch(showModal(MODALS.EXPLORE_CHARACTERS));
  }, [dispatch]);

  const onSetCharacterOrder = useCallback(() => {
    dispatch(showModal(MODALS.CHARACTER_Z_ORDER));
  }, [dispatch]);

  const onCreateAppearance = useCallback(() => {
    if (!ui.selectedCharacterId) return;

    const { spritesheet } = characters[ui.selectedCharacterId];
    const appearance = spritesheet.appearances[defaultAppearanceId(spritesheet)];

    const newAppearanceId = makeId("appearance");
    const newAppearanceData = appearance ? appearance[0] : null;
    dispatch(createCharacterAppearance(ui.selectedCharacterId, newAppearanceId, newAppearanceData));
    dispatch(paintCharacterAppearance(ui.selectedCharacterId, newAppearanceId));
  }, [ui.selectedCharacterId, characters, dispatch]);

  const toggleCharacterDropdown = useCallback(() => {
    setCharacterDropdownOpen(!characterDropdownOpen);
  }, [characterDropdownOpen]);

  return (
    <div className={`library-container tool-supported`}>
      <div className="panel library" data-tutorial-id="characters">
        <div className="header">
          <h2>Library</h2>
          <ButtonDropdown
            size="sm"
            isOpen={characterDropdownOpen}
            toggle={toggleCharacterDropdown}
          >
            <DropdownToggle caret>
              More
            </DropdownToggle>
            <DropdownMenu right>
              <DropdownItem onClick={onExploreCharacters}>Explore Characters...</DropdownItem>
              <DropdownItem onClick={onCreateDoor}>Add Door</DropdownItem>
              <DropdownItem divider />
              <DropdownItem onClick={onSetCharacterOrder}>Set Character Order...</DropdownItem>
            </DropdownMenu>
          </ButtonDropdown>
          <Button
            size="sm"
            data-tutorial-id="characters-add-button"
            onClick={onCreateCharacter}
          >
            <i className="fa fa-plus" />
          </Button>
        </div>
        {renderCharactersPanel()}
      </div>
      <div className="panel appearances">
        <div className="header">
          <h2>Appearances</h2>
          <Button size="sm" disabled={!ui.selectedCharacterId} onClick={onCreateAppearance}>
            <i className="fa fa-plus" />
          </Button>
        </div>
        {renderAppearancesPanel()}
      </div>
    </div>
  );
};
