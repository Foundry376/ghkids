import classNames from "classnames";
import React, { useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import Button from "reactstrap/lib/Button";
import ButtonDropdown from "reactstrap/lib/ButtonDropdown";
import DropdownItem from "reactstrap/lib/DropdownItem";
import DropdownMenu from "reactstrap/lib/DropdownMenu";
import DropdownToggle from "reactstrap/lib/DropdownToggle";

import { MODALS, TOOLS } from "../constants/constants";

import {
  changeCharacterAppearanceName,
  createCharacter,
  createCharacterAppearance,
  deleteCharacter,
  deleteCharacterAppearance,
  upsertCharacter,
} from "../actions/characters-actions";

import { setupRecordingForCharacter } from "../actions/recording-actions";

import {
  paintCharacterAppearance,
  select,
  selectToolId,
  selectToolItem,
  showModal,
} from "../actions/ui-actions";

import { Character, Characters, EditorState, UIState } from "../../types";
import { defaultAppearanceId } from "../utils/character-helpers";
import { makeId } from "../utils/utils";
import Sprite from "./sprites/sprite";
import { TapToEditLabel } from "./tap-to-edit-label";
import { createCharacterSpriteData, createAppearanceData } from "./stage/hooks";

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
}) => {
  const onDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.dropEffect = "copy";
      event.dataTransfer.effectAllowed = "copy";

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
      if (dragType === "sprite") {
        event.dataTransfer.setData(
          "sprite",
          createCharacterSpriteData(character.id, appearance),
        );
      } else if (dragType === "appearance" && appearance) {
        event.dataTransfer.setData(
          "appearance",
          createAppearanceData(character.id, appearance),
        );
      }
    },
    [character.id, appearance, dragType],
  );

  const { spritesheet } = character;

  return (
    <div
      className={classNames({ item: true, selected: selected })}
      draggable={labelEditable}
      onDragStart={onDragStart}
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
  const characters = useSelector<EditorState, Characters>((s) => s.characters);
  const ui = useSelector<EditorState, UIState>((s) => s.ui);
  const recordingActorId = useSelector<EditorState, string | null>((s) => s.recording.actorId);

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

  const renderCharactersPanel = () => {
    return (
      <div className="item-grid" onClick={onClickCharactersBackground}>
        {Object.keys(characters).map((id) => (
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
          />
        ))}
      </div>
    );
  };

  const renderAppearancesPanel = () => {
    const character = ui.selectedCharacterId ? characters[ui.selectedCharacterId] : null;

    if (!character) {
      return <div className="empty">Select an actor in your library to view it's appearances.</div>;
    }

    return (
      <div className="item-grid" onClick={onClickAppearancesBackground}>
        {Object.keys(character.spritesheet.appearances).map((appearanceId) => (
          <LibraryItem
            key={appearanceId}
            character={character}
            appearance={appearanceId}
            dragType="appearance"
            label={character.spritesheet.appearanceNames[appearanceId]}
            labelEditable={ui.selectedToolId === TOOLS.POINTER}
            onDoubleClick={() => dispatch(paintCharacterAppearance(character.id, appearanceId))}
            onClick={(event) => onClickAppearance(event, character.id, appearanceId)}
            onChangeLabel={(value) =>
              dispatch(changeCharacterAppearanceName(character.id, appearanceId, value))
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

  const onExploreCharacters = useCallback(() => {
    dispatch(showModal(MODALS.EXPLORE_CHARACTERS));
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
            data-tutorial-id="characters-add-button"
            toggle={toggleCharacterDropdown}
          >
            <DropdownToggle caret>
              <i className="fa fa-plus" />
            </DropdownToggle>
            <DropdownMenu right>
              <DropdownItem onClick={onCreateCharacter}>Draw new Character...</DropdownItem>
              <DropdownItem onClick={onExploreCharacters}>Explore Characters...</DropdownItem>
            </DropdownMenu>
          </ButtonDropdown>
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
