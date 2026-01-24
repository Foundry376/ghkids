import React, { useEffect, useRef } from "react";
import { Actor, ActorTransform, AppearanceInfo, Characters } from "../../../types";
import { STAGE_CELL_SIZE } from "../../constants/constants";
import { pointApplyingTransform } from "../../utils/stage-helpers";
import ActorSprite from "../sprites/actor-sprite";
import { DEFAULT_APPEARANCE_INFO } from "../sprites/sprite";

/**
 * Calculate the visual bounds and position offset needed to render a transformed
 * actor within a container. When an actor has a transform (rotation/flip), the
 * visual bounding box changes and may shift relative to the anchor point.
 *
 * Returns the container dimensions (in cells) and the position offset needed
 * so the actor's visual fits starting at (0, 0).
 */
function getTransformedBounds(
  info: AppearanceInfo,
  transform: ActorTransform | undefined,
): { offsetX: number; offsetY: number; width: number; height: number } {
  const t = transform ?? "0";

  // Calculate where the anchor ends up after transform
  const [anchorX, anchorY] = pointApplyingTransform(info.anchor.x, info.anchor.y, info, t);

  // Find the bounding box of all cells after transform
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (let dx = 0; dx < info.width; dx++) {
    for (let dy = 0; dy < info.height; dy++) {
      const [sx, sy] = pointApplyingTransform(dx, dy, info, t);
      // Position relative to anchor (how ActorSprite calculates grid positions)
      const x = sx - anchorX;
      const y = sy - anchorY;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return {
    // Position offset needed so the visual starts at (0, 0)
    offsetX: -minX,
    offsetY: -minY,
    // Visual dimensions in cells
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

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
