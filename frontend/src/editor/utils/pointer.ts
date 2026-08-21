import type { PointerEvent } from "react";
import { useRef } from "react";

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

/**
 * How far the pointer may travel between press and release and still count as
 * a click on the button it started on. Generous on purpose - a hand that
 * shakes while pressing moves a few pixels, and losing the click entirely is
 * far more confusing than acting on a slightly sloppy one. Past this the press
 * reads as a deliberate "slide away to cancel" and the click is dropped.
 */
const FORGIVING_CLICK_SLOP = 50;

/**
 * Returns props for a button that should still fire its `onClick` when the
 * pointer drifts off it before release.
 *
 * A native click only fires when press and release land on the same element,
 * so a user whose hand shakes - or who lifts a finger a few pixels past the
 * button's edge - gets nothing at all. Capturing the pointer on press makes
 * the browser deliver the release (and the click built from it) to the button
 * no matter where the cursor ended up. The click stays a real click, so
 * keyboard activation, disabled handling and dropdown toggles all keep
 * working; it just stops being cancelled by a wobble.
 *
 * Use for top-level controls that need true click semantics. Controls that can
 * safely fire the instant they're pressed should use `onPrimaryPointerDown`
 * instead, which is more forgiving still.
 */
export function useForgivingClick<E extends HTMLElement>(slop = FORGIVING_CLICK_SLOP) {
  const origin = useRef<{ x: number; y: number } | null>(null);

  return {
    onPointerDown: (event: PointerEvent<E>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      origin.current = { x: event.clientX, y: event.clientY };
      // Capture can throw if the pointer is already gone (it was released
      // between the event and this handler running).
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        origin.current = null;
      }
    },
    onPointerMove: (event: PointerEvent<E>) => {
      if (!origin.current || !event.currentTarget.hasPointerCapture(event.pointerId)) {
        return;
      }
      const dx = event.clientX - origin.current.x;
      const dy = event.clientY - origin.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > slop) {
        // Releasing the capture hands the release back to whatever is actually
        // under the cursor, so the click lands there (usually nowhere) instead
        // of on this button.
        origin.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    onPointerUp: () => {
      origin.current = null;
    },
  };
}
