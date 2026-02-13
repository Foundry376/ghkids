import React, { useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { Characters, RuleTreeItem, RuleTreeEventItem, RuleCondition } from "../../../types";
import { recordInputForGameState } from "../../actions/stage-actions";

/**
 * Maps legacy numeric keyCodes (used in group-event triggers) to the
 * Codako string key names used by the keyboard input handler.
 */
const KEYCODE_TO_KEY: Record<number, string> = {
  9: "Tab",
  13: "Enter",
  32: "Space",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
};

function keyCodeToKey(code: number): string {
  return KEYCODE_TO_KEY[code] || String.fromCharCode(code);
}

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

/**
 * Return all the key identifiers that should be placed in the input.keys object
 * for a given display key. This includes both the string name and any legacy
 * numeric code so both checkEvent (numeric) and condition (string) paths match.
 */
function inputKeysForDisplayKey(key: string): string[] {
  const result = [key];
  // Add the legacy numeric keyCode equivalent
  for (const [code, name] of Object.entries(KEYCODE_TO_KEY)) {
    if (name === key) {
      result.push(code);
      break;
    }
  }
  // For single letters dispatched uppercase, also include lowercase
  if (key.length === 1 && key >= "A" && key <= "Z") {
    result.push(key.toLowerCase());
  }
  if (key.length === 1 && key >= "a" && key <= "z") {
    result.push(key.toUpperCase());
  }
  return result;
}

interface TouchKeysProps {
  worldId: string;
  characters: Characters;
}

const TouchKeys: React.FC<TouchKeysProps> = ({ worldId, characters }) => {
  const dispatch = useDispatch();
  const heldKeysRef = useRef<Set<string>>(new Set());
  const usedKeys = getUsedKeys(characters);

  const syncKeys = useCallback(() => {
    const keysObj: { [key: string]: true } = {};
    heldKeysRef.current.forEach((k) => {
      keysObj[k] = true;
    });
    dispatch(recordInputForGameState(worldId, { keys: keysObj }));
  }, [dispatch, worldId]);

  const pressKey = useCallback(
    (key: string) => {
      const allKeys = inputKeysForDisplayKey(key);
      allKeys.forEach((k) => heldKeysRef.current.add(k));
      syncKeys();
    },
    [syncKeys],
  );

  const releaseKey = useCallback(
    (key: string) => {
      const allKeys = inputKeysForDisplayKey(key);
      allKeys.forEach((k) => heldKeysRef.current.delete(k));
      syncKeys();
    },
    [syncKeys],
  );

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
