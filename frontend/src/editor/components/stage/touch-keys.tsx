import React, { useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { Characters, RuleTreeItem, RuleTreeEventItem, RuleCondition } from "../../../types";
import { recordInputForGameState } from "../../actions/stage-actions";
import {
  heldKeysAsInput,
  holdKeys,
  KeySource,
  releaseKeys,
  releaseSource,
} from "../../utils/held-keys";
import { inputKeysForKey, KEYCODE_TO_KEY, keyCodeToKey } from "../../utils/keys";

/** Display label for a Codako key string. */
function labelForKey(key: string): string {
  switch (key) {
    case "ArrowUp":
      return "\u25B2";
    case "ArrowDown":
      return "\u25BC";
    case "ArrowLeft":
      return "\u25C0";
    case "ArrowRight":
      return "\u25B6";
    case "Space":
      return "Space";
    case "Enter":
      return "\u23CE";
    case "Tab":
      return "Tab";
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

const ARROW_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

/**
 * Walk a character's rule tree and collect every key that appears in either
 * a group-event key trigger or a keypress-condition constant.
 */
function collectKeysFromRules(rules: RuleTreeItem[], keys: Set<string>) {
  for (const item of rules) {
    if (item.type === "group-event") {
      const ev = item as RuleTreeEventItem;
      if (ev.event === "key" && ev.code != null) {
        // code is stored as a number (legacy keyCode) or possibly a string at runtime
        if (typeof ev.code === "number") {
          keys.add(keyCodeToKey(ev.code));
          // Also add the raw code as a string so checkEvent matches input.keys[code]
          keys.add(String(ev.code));
        } else {
          keys.add(String(ev.code));
        }
      }
      if (ev.rules) {
        collectKeysFromRules(ev.rules, keys);
      }
    } else if (item.type === "group-flow") {
      if (item.rules) {
        collectKeysFromRules(item.rules, keys);
      }
    } else if (item.type === "rule") {
      // Check conditions for keypress references
      for (const cond of item.conditions || []) {
        collectKeysFromCondition(cond, keys);
      }
    }
  }
}

function collectKeysFromCondition(cond: RuleCondition, keys: Set<string>) {
  if ("globalId" in cond.left && cond.left.globalId === "keypress") {
    if ("constant" in cond.right && typeof cond.right.constant === "string") {
      keys.add(cond.right.constant);
    }
  }
}

/** Extract all unique keys used in any character's rules. */
export function getUsedKeys(characters: Characters): string[] {
  const keys = new Set<string>();
  for (const char of Object.values(characters)) {
    collectKeysFromRules(char.rules, keys);
  }

  // Deduplicate: if we added both the numeric code and its string equivalent,
  // only keep the string equivalent for display purposes. Keep the numeric form
  // so it appears in the dispatched input.
  const display: string[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    // Skip purely numeric keys that have a string equivalent already in the set
    if (/^\d+$/.test(k)) {
      const mapped = KEYCODE_TO_KEY[Number(k)];
      if (mapped && keys.has(mapped)) continue;
    }
    if (!seen.has(k)) {
      seen.add(k);
      display.push(k);
    }
  }
  return display;
}

interface TouchKeysProps {
  worldId: string;
  characters: Characters;
}

const TouchKeys: React.FC<TouchKeysProps> = ({ worldId, characters }) => {
  const dispatch = useDispatch();
  // Identifies these buttons' holds among the other live sources, so that
  // letting go of a button doesn't cancel a physical key that's still down.
  const source = useRef<KeySource>({}).current;
  const usedKeys = getUsedKeys(characters);

  const syncKeys = useCallback(() => {
    dispatch(recordInputForGameState(worldId, { keys: heldKeysAsInput() }));
  }, [dispatch, worldId]);

  // Holding a touch key works like holding a physical key: the shared held-keys
  // module lets the playback loop re-apply it after each tick clears the input.
  const pressKey = useCallback(
    (key: string) => {
      holdKeys(source, inputKeysForKey(key));
      syncKeys();
    },
    [source, syncKeys],
  );

  const releaseKey = useCallback(
    (key: string) => {
      releaseKeys(source, inputKeysForKey(key));
      syncKeys();
    },
    [source, syncKeys],
  );

  // Same reason as the keyboard handler: a button still held when this
  // unmounts would otherwise stay held in the module forever.
  useEffect(() => () => void releaseSource(source), [source]);

  if (usedKeys.length === 0) {
    return null;
  }

  // Separate arrow keys from other keys for layout
  const arrows = usedKeys.filter((k) => ARROW_KEYS.has(k));
  const others = usedKeys.filter((k) => !ARROW_KEYS.has(k));

  // Sort arrows in display order: up, left, down, right
  const arrowOrder = ["ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"];
  arrows.sort((a, b) => arrowOrder.indexOf(a) - arrowOrder.indexOf(b));

  return (
    <div className="touch-keys">
      {others.length > 0 && (
        <div className="touch-keys__group">
          {others.map((key) => (
            <TouchKeyButton key={key} keyName={key} onPress={pressKey} onRelease={releaseKey} />
          ))}
        </div>
      )}
      {arrows.length > 0 && (
        <div className="touch-keys__arrows">
          {/* Render in a compact cross layout */}
          <div className="touch-keys__arrow-row">
            {arrows.includes("ArrowUp") && (
              <TouchKeyButton keyName="ArrowUp" onPress={pressKey} onRelease={releaseKey} />
            )}
          </div>
          <div className="touch-keys__arrow-row">
            {arrows.includes("ArrowLeft") && (
              <TouchKeyButton keyName="ArrowLeft" onPress={pressKey} onRelease={releaseKey} />
            )}
            {arrows.includes("ArrowDown") && (
              <TouchKeyButton keyName="ArrowDown" onPress={pressKey} onRelease={releaseKey} />
            )}
            {arrows.includes("ArrowRight") && (
              <TouchKeyButton keyName="ArrowRight" onPress={pressKey} onRelease={releaseKey} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface TouchKeyButtonProps {
  keyName: string;
  onPress: (key: string) => void;
  onRelease: (key: string) => void;
}

const TouchKeyButton: React.FC<TouchKeyButtonProps> = ({ keyName, onPress, onRelease }) => {
  const handleStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      onPress(keyName);
    },
    [keyName, onPress],
  );

  const handleEnd = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      onRelease(keyName);
    },
    [keyName, onRelease],
  );

  return (
    <button
      className="touch-keys__key"
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {labelForKey(keyName)}
    </button>
  );
};

export default TouchKeys;
