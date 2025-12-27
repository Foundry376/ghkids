import React, { useEffect, useRef } from "react";
import { Actor, Characters } from "../../../types";
import ActorSprite from "../sprites/actor-sprite";
import { STAGE_CELL_SIZE } from "../../constants/constants";

interface ActorSelectionPopoverProps {
  actors: Actor[];
  characters: Characters;
  position: { x: number; y: number }; // Screen pixel position for popover
  onSelect: (actor: Actor) => void;
  onDragStart: (actor: Actor) => void;
  onClose: () => void;
}

const ActorSelectionPopover: React.FC<ActorSelectionPopoverProps> = ({
  actors,
  characters,
  position,
  onSelect,
  onDragStart,
  onClose,
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
        {actors.map((actor) => {
          const character = characters[actor.characterId];
          if (!character) return null;

          return (
            <div
              key={actor.id}
              className="actor-option"
              style={{
                width: STAGE_CELL_SIZE + 8,
                height: STAGE_CELL_SIZE + 8,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 4,
                  top: 4,
                  width: STAGE_CELL_SIZE,
                  height: STAGE_CELL_SIZE,
                }}
              >
                <ActorSprite
                  character={character}
                  actor={{ ...actor, position: { x: 0, y: 0 } }}
                  selected={false}
                  dragActorIds={[actor.id]}
                  onMouseUp={() => onSelect(actor)}
                  onDragStart={() => onDragStart(actor)}
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
