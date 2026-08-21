import type { MouseEvent, PointerEvent } from "react";

/**
 * How far outside a button the pointer may be released and still count as a
 * click on it. Generous on purpose: losing a click to a shaky hand is far more
 * confusing than acting on a sloppy one. Past this the gesture reads as a
 * deliberate "slide away to cancel".
 */
const PRESS_SLOP = 50;

interface ForgivingPressOptions {
  /**
   * "press" acts on pointerdown, which suits non-destructive mode switches
   * (tool selection, playback) and makes them feel instant. "release" keeps
   * true click semantics for anything worth being able to change your mind
   * about mid-press.
   */
  fireOn?: "press" | "release";
  slop?: number;
}

/**
 * Props for a button that should still act when the press wanders - which it
 * does for anyone whose hand shakes, and for a mouse nudged while clicking.
 *
 * Capturing the pointer keeps the whole gesture on the button: the release
 * (and the click built from it) is delivered here no matter where the cursor
 * ended up, and nothing under the cursor can start a native drag mid-press.
 * Wandering further than `slop` from the button releases the capture, so the
 * click lands wherever the cursor actually is instead - usually nowhere.
 *
 * `activate` is optional: pass nothing to make a control that handles its own
 * click (a dropdown toggle, say) merely tolerant of drift.
 */
export function forgivingPress<E extends HTMLElement>(
  activate?: (event: PointerEvent<E> | MouseEvent<E>) => void,
  { fireOn = "release", slop = PRESS_SLOP }: ForgivingPressOptions = {},
) {
  const props = {
    onPointerDown: (event: PointerEvent<E>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // The pointer was already released.
      }
      if (fireOn === "press") {
        activate?.(event);
      }
    },
    onPointerMove: (event: PointerEvent<E>) => {
      const el = event.currentTarget;
      if (!el.hasPointerCapture(event.pointerId)) {
        return;
      }
      if (distanceOutside(el.getBoundingClientRect(), event.clientX, event.clientY) > slop) {
        el.releasePointerCapture(event.pointerId);
      }
    },
  };

  if (!activate) {
    return props;
  }

  return {
    ...props,
    // detail === 0 means keyboard activation, the one click a "press" button
    // has not already handled.
    onClick: (event: MouseEvent<E>) => {
      if (fireOn === "release" || event.detail === 0) {
        activate(event);
      }
    },
  };
}

function distanceOutside(rect: DOMRect, x: number, y: number) {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.sqrt(dx * dx + dy * dy);
}
