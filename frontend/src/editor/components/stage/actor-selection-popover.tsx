import React, { useEffect, useRef } from "react";
import { Actor, Characters } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import { getTransformedBounds } from "../../utils/stage-helpers";
import ActorSprite from "../sprites/actor-sprite";
import { DEFAULT_APPEARANCE_INFO } from "../sprites/sprite";

interface ActorSelectionPopoverProps {
  actors: Actor[];
  characters: Characters;
  position: { x: number; y: number }; // Screen pixel position for popover
  onSelect: (actor: Actor) => void;
  onClose: () => void;
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
  position,
  onSelect,
  onClose,
  onStartDrag,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Calculate popover position, keeping it on screen
  const popoverStyle: React.CSSProperties = {
    position: "fixed",
    left: position.x,
    top: position.y + 10,
    zIndex: 1000,
  };

  return (
    <div ref={popoverRef} className="actor-selection-popover" style={popoverStyle}>
      <div className="actor-selection-popover-content">
        {[...actors].reverse().map((actor) => {
          const character = characters[actor.characterId];
          const { appearanceInfo } = character.spritesheet;
          const info = appearanceInfo?.[actor.appearance] || DEFAULT_APPEARANCE_INFO;

          if (!character) return null;

          // Calculate transformed bounds to properly size container and position sprite
          const bounds = getTransformedBounds(info, actor.transform);

          return (
            <div
              key={actor.id}
              className="actor-option"
              style={{
                width: bounds.width * STAGE_CELL_SIZE + 8,
                height: bounds.height * STAGE_CELL_SIZE + 8,
                padding: 2,
                overflow: "hidden",
              }}
            >
              <div style={{ position: "relative" }}>
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
      </div>
    </div>
  );
};

export default ActorSelectionPopover;
