import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import Button from "reactstrap/lib/Button";
import Modal from "reactstrap/lib/Modal";
import ModalBody from "reactstrap/lib/ModalBody";
import ModalFooter from "reactstrap/lib/ModalFooter";

import { Character } from "../../../types";
import { useEditorSelector } from "../../../hooks/redux";
import { setCharacterZOrder } from "../../actions/characters-actions";
import { dismissModal } from "../../actions/ui-actions";
import { MODALS } from "../../constants/constants";
import { defaultAppearanceId } from "../../utils/character-helpers";
import Sprite from "../sprites/sprite";

const CharacterZOrderModal = () => {
  const dispatch = useDispatch();
  const open = useEditorSelector((state) => state.ui.modal.openId === MODALS.CHARACTER_Z_ORDER);
  const characters = useEditorSelector((state) => state.characters);
  const characterZOrder = useEditorSelector((state) => state.characterZOrder);

  // Local ordering state so drags are instant, committed on Done
  const [order, setOrder] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number>(-1);
  const [dropIndex, setDropIndex] = useState<number>(-1);

  const listRef = useRef<HTMLDivElement>(null);

  // Sync local state when modal opens
  useEffect(() => {
    if (open) {
      const validOrder = characterZOrder.filter((id) => characters[id]);
      // Add any characters not yet in the z-order
      for (const id of Object.keys(characters)) {
        if (!validOrder.includes(id)) {
          validOrder.push(id);
        }
      }
      setOrder([...validOrder].reverse());
    }
  }, [open, characters, characterZOrder]);

  const onDragStart = useCallback(
    (event: React.DragEvent, index: number) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
      setDragIndex(index);
    },
    [],
  );

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";

      if (!listRef.current) return;
      const rows = Array.from(listRef.current.children);
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect();
        if (event.clientY < rect.top + rect.height / 2) {
          if (dropIndex !== i) setDropIndex(i);
          return;
        }
      }
      const newIndex = rows.length;
      if (dropIndex !== newIndex) setDropIndex(newIndex);
    },
    [dropIndex],
  );

  const onDragEnd = useCallback(() => {
    if (dragIndex !== -1 && dropIndex !== -1 && dragIndex !== dropIndex) {
      setOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIndex, 1);
        const insertAt = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
        next.splice(insertAt, 0, moved);
        return next;
      });
    }
    setDragIndex(-1);
    setDropIndex(-1);
  }, [dragIndex, dropIndex]);

  const onDone = useCallback(() => {
    dispatch(setCharacterZOrder([...order].reverse()));
    dispatch(dismissModal());
  }, [dispatch, order]);

  const onCancel = useCallback(() => {
    dispatch(dismissModal());
  }, [dispatch]);

  const renderRow = (characterId: string, index: number) => {
    const character: Character | undefined = characters[characterId];
    if (!character) return null;

    const isDragging = dragIndex === index;
    const showDropAbove = dropIndex === index && dragIndex !== index && dragIndex !== index - 1;

    return (
      <div
        key={characterId}
        className={`z-order-row ${isDragging ? "dragging" : ""} ${showDropAbove ? "drop-above" : ""}`}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragEnd={onDragEnd}
      >
        <span className="drag-handle">&#x2630;</span>
        <Sprite
          spritesheet={character.spritesheet}
          appearance={defaultAppearanceId(character.spritesheet)}
          fit
        />
        <span className="character-name">{character.name}</span>
      </div>
    );
  };

  return (
    <Modal isOpen={open} backdrop="static" toggle={() => {}} style={{ minWidth: 400, maxWidth: 400 }}>
      <div className="modal-header" style={{ display: "flex" }}>
        <h4 style={{ flex: 1 }}>Character Draw Order</h4>
      </div>
      <ModalBody>
        <p className="z-order-hint">
          Characters at the top of the list are drawn on top. Drag to reorder.
        </p>
        <div className="z-order-list" ref={listRef} onDragOver={onDragOver}>
          {order.map((id, i) => renderRow(id, i))}
          {dropIndex === order.length && dragIndex !== order.length - 1 && (
            <div className="z-order-drop-indicator" />
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button color="primary" onClick={onDone}>
          Done
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CharacterZOrderModal;
