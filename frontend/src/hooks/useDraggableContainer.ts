import { FocusEventHandler, useState } from "react";

const isTextInput = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && el.type === "text") ||
  (el instanceof HTMLElement && el.isContentEditable);

/**
 * Returns props to spread on a container that is both `draggable` and contains
 * text inputs. While a text input inside the container is focused, `draggable`
 * is set to false so the browser's native drag doesn't interfere with cursor
 * positioning and text selection.
 *
 * Usage:
 * ```tsx
 * const { containerProps } = useDraggableContainer();
 * return <div {...containerProps} draggable={containerProps.draggable && myOtherCondition}>…</div>
 * ```
 */
export function useDraggableContainer() {
  const [textFocused, setTextFocused] = useState(false);

  const onFocus: FocusEventHandler = (e) => {
    if (isTextInput(e.target)) setTextFocused(true);
  };

  const onBlur: FocusEventHandler = (e) => {
    if (isTextInput(e.target)) setTextFocused(false);
  };

  return {
    textFocused,
    containerProps: {
      draggable: !textFocused,
      onFocus,
      onBlur,
    },
  };
}
