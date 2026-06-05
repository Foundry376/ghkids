import { useCallback, useRef } from "react";

interface ForgivingClickOptions {
  /** Max time (ms) between press and release to still count as a click. */
  maxDuration?: number;
  /** Max distance (px) the pointer may travel and still count as a click. */
  maxDistance?: number;
}

/**
 * Makes a button forgiving of the small accidental drags young users produce
 * when they nudge the cursor while pressing. Native `click` only fires when
 * the press and release land on the same element, so a press that lifts just
 * off the button's edge is otherwise lost.
 *
 * On pointer down we capture the pointer (so the element keeps receiving
 * events even once the cursor leaves it) and remember where/when the press
 * started. On pointer up we fire the handler if the gesture was short and
 * small, no matter where the pointer ended up.
 *
 * The handler also stays wired to `onClick` so keyboard activation
 * (Enter/Space, which produce no pointer gesture) keeps working. A guard
 * prevents the synthesized click that follows a normal mouse press from
 * firing the handler twice.
 *
 * Spread the returned props onto the button:
 *   const click = useForgivingClick(() => doThing());
 *   <Button {...click} />
 */
export function useForgivingClick<E extends HTMLElement = HTMLElement>(
  handler: (event: React.SyntheticEvent<E>) => void,
  { maxDuration = 500, maxDistance = 20 }: ForgivingClickOptions = {},
) {
  const start = useRef<{ x: number; y: number; time: number; pointerId: number } | null>(null);
  // True between a pointer-driven activation and the click the browser
  // synthesizes for it, so we can swallow that duplicate click.
  const handledViaPointer = useRef(false);

  const onPointerDown = useCallback((event: React.PointerEvent<E>) => {
    // Only react to the primary (left) mouse button; touch/pen report 0.
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    start.current = {
      x: event.clientX,
      y: event.clientY,
      time: performance.now(),
      pointerId: event.pointerId,
    };
    // Capture so we still get pointerup if the cursor drifts off the button.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is best-effort; the handler still works without it.
    }
  }, []);

  const onPointerUp = useCallback(
    (event: React.PointerEvent<E>) => {
      const began = start.current;
      start.current = null;
      if (!began || began.pointerId !== event.pointerId) {
        return;
      }
      const elapsed = performance.now() - began.time;
      const distance = Math.hypot(event.clientX - began.x, event.clientY - began.y);
      if (elapsed > maxDuration || distance > maxDistance) {
        return;
      }
      handledViaPointer.current = true;
      // In case the browser does not synthesize a click for this gesture
      // (e.g. it was released off the button), clear the guard on the next
      // tick so a later keyboard activation is not swallowed.
      setTimeout(() => {
        handledViaPointer.current = false;
      }, 0);
      handler(event);
    },
    [handler, maxDuration, maxDistance],
  );

  const onClick = useCallback(
    (event: React.MouseEvent<E>) => {
      if (handledViaPointer.current) {
        handledViaPointer.current = false;
        return;
      }
      handler(event);
    },
    [handler],
  );

  return { onPointerDown, onPointerUp, onClick };
}
