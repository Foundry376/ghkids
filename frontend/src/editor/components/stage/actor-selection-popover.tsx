import React, { useCallback, useEffect, useRef, useState } from "react";
import { Actor, Characters } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import { getTransformedBounds } from "../../utils/stage-helpers";
import ActorSprite from "../sprites/actor-sprite";
import { DEFAULT_APPEARANCE_INFO } from "../sprites/sprite";

interface ActorSelectionPopoverProps {
  actors: Actor[];
  characters: Characters;
  characterZOrder: string[];
  position: { x: number; y: number }; // Screen pixel position for popover
  onSelect: (actor: Actor) => void;
  onClose: () => void;
  onReorder?: (newCharacterZOrder: string[]) => void;
  onStartDrag?: (
    actor: Actor,
    actorIds: string[],
    event: React.DragEvent,
    anchorOffset: { x: number; y: number },
  ) => void;
}

const ActorSelectionPopover: React.FC<ActorSelectionPopoverProps> = ({
  actors,
  characters,
  characterZOrder,
  position,
  onSelect,
  onClose,
  onReorder,
  onStartDrag,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Display order: top = highest z (reversed from the z-order array)
  const [orderedActors, setOrderedActors] = useState<Actor[]>(() => [...actors].reverse());
  const [reorder, setReorder] = useState<{ dragIndex: number; dropIndex: number } | null>(null);

  // Refs for accessing latest values in mouse-event handlers
  const orderedActorsRef = useRef(orderedActors);
  orderedActorsRef.current = orderedActors;
  const characterZOrderRef = useRef(characterZOrder);
  characterZOrderRef.current = characterZOrder;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const reorderRef = useRef(reorder);
  reorderRef.current = reorder;

  useEffect(() => {
    const newOrder = [...actors].reverse();
    setOrderedActors(newOrder);
    orderedActorsRef.current = newOrder;
  }, [actors]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Delay adding listener to avoid immediate close from the triggering click
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const applyReorder = useCallback((dragIdx: number, dropIdx: number) => {
    const current = orderedActorsRef.current;
    const next = [...current];
    const [moved] = next.splice(dragIdx, 1);
    const insertAt = dropIdx > dragIdx ? dropIdx - 1 : dropIdx;
    next.splice(insertAt, 0, moved);
    setOrderedActors(next);
    orderedActorsRef.current = next;

    const cb = onReorderRef.current;
    if (!cb) return;

    // Compute new characterZOrder from the new visual order.
    // Visual order is top-to-bottom = highest-z first. The characterZOrder
    // array stores lowest-z first, so we reverse the unique character list.
    const czOrder = characterZOrderRef.current;
    const seen = new Set<string>();
    const uniqueVisual: string[] = [];
    for (const actor of next) {
      if (!seen.has(actor.characterId)) {
        seen.add(actor.characterId);
        uniqueVisual.push(actor.characterId);
      }
    }
    const reorderedChars = [...uniqueVisual].reverse();
    const slots = reorderedChars
      .map((id) => czOrder.indexOf(id))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);

    const result = [...czOrder];
    for (let i = 0; i < slots.length && i < reorderedChars.length; i++) {
      result[slots[i]] = reorderedChars[i];
    }
    cb(result);
  }, []);

  const onHandleMouseDown = useCallback(
    (event: React.MouseEvent, index: number) => {
      event.preventDefault();
      event.stopPropagation();

      const state = { dragIndex: index, dropIndex: index };
      reorderRef.current = state;
      setReorder({ ...state });

      const onMouseMove = (e: MouseEvent) => {
        if (!listRef.current || !reorderRef.current) return;
        const items = Array.from(listRef.current.querySelectorAll(".actor-option"));
        let newDropIndex = items.length;
        for (let i = 0; i < items.length; i++) {
          const rect = items[i].getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) {
            newDropIndex = i;
            break;
          }
        }
        reorderRef.current.dropIndex = newDropIndex;
        setReorder({ ...reorderRef.current });
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);

        const s = reorderRef.current;
        if (s && s.dragIndex !== s.dropIndex) {
          applyReorder(s.dragIndex, s.dropIndex);
        }
        reorderRef.current = null;
        setReorder(null);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [applyReorder],
  );

  // Calculate popover position, keeping it on screen
  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y + 10,
    zIndex: 1000,
  };

  return (
    <div ref={popoverRef} className="actor-selection-popover" style={popoverStyle}>
      <div className="actor-selection-popover-content" ref={listRef}>
        {orderedActors.map((actor, index) => {
          const character = characters[actor.characterId];
          const { appearanceInfo } = character.spritesheet;
          const info = appearanceInfo?.[actor.appearance] || DEFAULT_APPEARANCE_INFO;

          if (!character) return null;

          // Calculate transformed bounds to properly size container and position sprite
          const bounds = getTransformedBounds(info, actor.transform);

          const isDragging = reorder?.dragIndex === index;
          const showDropAbove =
            reorder !== null &&
            reorder.dropIndex === index &&
            reorder.dragIndex !== index &&
            reorder.dragIndex !== index - 1;

          return (
            <div
              key={actor.id}
              className={`actor-option${isDragging ? " reorder-dragging" : ""}${showDropAbove ? " reorder-drop-above" : ""}`}
              style={{
                padding: 2,
                overflow: "hidden",
              }}
            >
              {onReorder && (
                <span
                  className="reorder-handle"
                  onMouseDown={(e) => onHandleMouseDown(e, index)}
                >
                  &#x2630;
                </span>
              )}
              <div
                style={{
                  position: "relative",
                  width: bounds.width * STAGE_CELL_SIZE + 4,
                  height: bounds.height * STAGE_CELL_SIZE + 4,
                  flexShrink: 0,
                }}
              >
                <ActorSprite
                  character={character}
                  actor={{ ...actor, position: { x: bounds.offsetX, y: bounds.offsetY } }}
                  selected={false}
                  onMouseUp={() => onSelect(actor)}
                  dragActorIds={onStartDrag ? [actor.id] : undefined}
                  onStartDrag={
                    onStartDrag
                      ? (_, actorIds, event, anchorOffset) => {
                          // Use the real actor (with original position), not the display-modified one
                          // Don't close popover here - it would unmount the drag source element.
                          // The popover will be closed by Stage when the drag ends.
                          onStartDrag(actor, actorIds, event, anchorOffset);
                        }
                      : undefined
                  }
                />
              </div>
            </div>
          );
        })}
        {reorder !== null &&
          reorder.dropIndex === orderedActors.length &&
          reorder.dragIndex !== orderedActors.length - 1 && (
            <div className="reorder-drop-indicator" />
          )}
      </div>
    </div>
  );
};

export default ActorSelectionPopover;
