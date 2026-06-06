import type { PointerEvent } from "react";

/**
 * Wraps a handler so a control fires on pointer *down* rather than waiting for
 * a full click (press and release on the same element).
 *
 * Firing on press makes the core editor controls feel instant and sidesteps
 * the accidental drags young users produce when they nudge the mouse while
 * pressing: the action has already happened before any drag could be
 * interpreted. Non-primary mouse buttons (right/middle) are ignored; touch and
 * pen report button 0 and pass through.
 *
 * Use for non-destructive, easily reversible controls (tool/mode selection,
 * playback). Avoid for committed or destructive actions, which benefit from
 * the cancel-by-releasing-elsewhere affordance of a real click.
 */
export function onPrimaryPointerDown<E extends Element>(
  handler: (event: PointerEvent<E>) => void,
) {
  return (event: PointerEvent<E>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    handler(event);
  };
}
