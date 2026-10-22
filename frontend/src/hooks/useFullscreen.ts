import { useCallback, useEffect, useRef, useState } from "react";

interface UseFullscreenOptions {
  /**
   * Which element is handed to the Fullscreen API.
   *
   * - `"element"` (default): the element `containerRef` is attached to. Use this
   *   when the point of fullscreen is to hide the rest of the page.
   * - `"document"`: the root <html> element. Use this when the page needs to keep
   *   working normally in fullscreen. Only the fullscreen element and its
   *   descendants are painted (everything else sits behind the fullscreen
   *   backdrop and stops hit-testing), so anything rendered into `document.body` —
   *   React portals, reactstrap modals, the cursor image in cursor-support.tsx —
   *   silently disappears when a nested container is the fullscreen element.
   */
  target?: "element" | "document";

  /**
   * While mounted, bind F11 (and Cmd/Ctrl+Shift+F, for keyboards without a
   * usable F11) to `toggle`.
   */
  shortcut?: boolean;
}

/** Human-readable form of the keyboard shortcut, for menu items and tooltips. */
export const FULLSCREEN_SHORTCUT_LABEL =
  typeof navigator !== "undefined" && /Mac|iPad|iPhone/.test(navigator.userAgent)
    ? "\u21e7\u2318F"
    : "F11";

/**
 * iPadOS draws a large, fixed "exit full screen" button over the top-left corner
 * of the page while it's fullscreen. It isn't part of the DOM, so nothing can be
 * stacked above it or moved out of its way except our own UI. iPads have
 * reported themselves as Macs since iPadOS 13; a Mac with a touchscreen doesn't
 * exist, so touch support gives them away.
 */
const IS_IPAD =
  typeof navigator !== "undefined" &&
  (/iPad/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

/**
 * On touch devices, focusing a text field raises the on-screen keyboard, and on
 * iPad the keyboard also ends fullscreen. Fields the user didn't tap shouldn't
 * take focus on their own there.
 */
export const AUTOFOCUS_TEXT_FIELDS =
  !IS_IPAD && !(typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches);

/** Set on <html> while the iPad's exit button covers the top-left corner. */
export const IPAD_FULLSCREEN_CLASS = "ipad-fullscreen";

if (IS_IPAD && typeof document !== "undefined") {
  // Kept at module scope rather than in the hook so the class is cleared even
  // when fullscreen ends after the page that entered it has unmounted.
  document.addEventListener("fullscreenchange", () => {
    document.documentElement.classList.toggle(IPAD_FULLSCREEN_CLASS, !!document.fullscreenElement);
  });
}

/**
 * iPadOS ends element fullscreen whenever the on-screen keyboard comes up, and
 * nothing can stop it. This puts the page back into fullscreen once editing is
 * over, but only when fullscreen was on when editing began and the user didn't
 * leave it on purpose (Escape, or our own exit/toggle).
 *
 * Safari only grants requestFullscreen during a user gesture. Editing that ends
 * inside one (Enter, or tapping elsewhere) is restored straight from focusout;
 * otherwise (the keyboard's dismiss button) the next tap or key press does it.
 *
 * Kept free of the DOM so the logic can be unit tested; see
 * useRestoreFullscreenAfterKeyboard for the wiring.
 */
export function createKeyboardFullscreenRestorer(env: {
  isFullscreen: () => boolean;
  requestFullscreen: () => Promise<void>;
}) {
  const MAX_ATTEMPTS = 3;
  let editing = false;
  let wasFullscreen = false;
  let leftOnPurpose = false;
  // Attempts left for the next gesture to restore fullscreen; 0 when not armed.
  let armed = 0;
  let inFlight = false;

  const attempt = (attemptsIfRefused: number) => {
    inFlight = true;
    env.requestFullscreen().then(
      () => {
        inFlight = false;
        armed = 0;
      },
      () => {
        inFlight = false;
        armed = !editing && !leftOnPurpose && !env.isFullscreen() ? attemptsIfRefused : 0;
      },
    );
  };

  return {
    /** A text field took focus. */
    focusIn() {
      if (!editing) {
        // A restore still waiting for a gesture means this is the same session.
        wasFullscreen = env.isFullscreen() || armed > 0;
        leftOnPurpose = false;
      }
      editing = true;
      armed = 0;
    },
    /** Focus left a text field; `toTextField` if it went straight to another one. */
    focusOut(toTextField: boolean) {
      if (!editing || toTextField) return;
      editing = false;
      if (wasFullscreen && !leftOnPurpose && !env.isFullscreen()) {
        attempt(MAX_ATTEMPTS);
      }
      wasFullscreen = false;
    },
    fullscreenChange() {
      if (env.isFullscreen()) {
        armed = 0;
        if (editing) wasFullscreen = true;
      }
    },
    /** The user left fullscreen deliberately; don't bring it back. */
    leftFullscreenOnPurpose() {
      leftOnPurpose = true;
      armed = 0;
    },
    /** A tap or key press, which Safari counts as a user gesture. */
    gesture(onTextField: boolean) {
      // A tap on a text field is about to raise the keyboard again; focusIn
      // carries the pending restore over to that field.
      if (!armed || inFlight || onTextField) return;
      if (env.isFullscreen()) {
        armed = 0;
        return;
      }
      attempt(armed - 1);
    },
    get armed() {
      return armed > 0;
    },
  };
}

type KeyboardFullscreenRestorer = ReturnType<typeof createKeyboardFullscreenRestorer>;
const activeRestorers = new Set<KeyboardFullscreenRestorer>();

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/** Whether focusing this element raises the on-screen keyboard. */
function isTextField(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLInputElement) return !el.readOnly && !NON_TEXT_INPUT_TYPES.has(el.type);
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  return el.isContentEditable;
}

/**
 * While mounted on iPad, re-enters fullscreen (via `enter`) after the on-screen
 * keyboard knocked the page out of it. See createKeyboardFullscreenRestorer.
 */
export function useRestoreFullscreenAfterKeyboard(enter: () => Promise<void>, enabled = IS_IPAD) {
  const enterRef = useRef(enter);
  enterRef.current = enter;

  useEffect(() => {
    if (!enabled) return;
    const restorer = createKeyboardFullscreenRestorer({
      isFullscreen: () => !!document.fullscreenElement,
      requestFullscreen: () => {
        try {
          return enterRef.current();
        } catch (err) {
          return Promise.reject(err);
        }
      },
    });
    activeRestorers.add(restorer);

    const onFocusIn = (e: FocusEvent) => {
      if (isTextField(e.target)) restorer.focusIn();
    };
    const onFocusOut = (e: FocusEvent) => {
      if (isTextField(e.target)) restorer.focusOut(isTextField(e.relatedTarget));
    };
    const onFullscreenChange = () => restorer.fullscreenChange();
    const onGesture = (e: Event) => restorer.gesture(isTextField(e.target));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") restorer.leftFullscreenOnPurpose();
      else onGesture(e);
    };

    const gestures = ["pointerup", "touchend", "click"] as const;
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onKeyDown, true);
    gestures.forEach((type) => document.addEventListener(type, onGesture, true));
    return () => {
      activeRestorers.delete(restorer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("keydown", onKeyDown, true);
      gestures.forEach((type) => document.removeEventListener(type, onGesture, true));
    };
  }, [enabled]);
}

export function isFullscreenShortcut(event: KeyboardEvent) {
  if (event.repeat) return false;
  if (event.key === "F11") {
    return !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
  }
  // macOS maps F11 to a system function and many compact keyboards need Fn to
  // reach it at all, so accept a chord as well.
  if (event.key === "f" || event.key === "F") {
    return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey;
  }
  return false;
}

/**
 * Tracks and controls fullscreen state for a container element.
 * Returns a ref to attach to the element that should go fullscreen,
 * plus state and toggle/enter/exit helpers.
 */
export function useFullscreen<T extends HTMLElement = HTMLDivElement>({
  target = "element",
  shortcut = false,
}: UseFullscreenOptions = {}) {
  const containerRef = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback((): Promise<void> => {
    const el: HTMLElement | null =
      target === "document" ? document.documentElement : containerRef.current;
    return el?.requestFullscreen?.() ?? Promise.reject(new Error("Fullscreen not supported"));
  }, [target]);

  const exit = useCallback((): Promise<void> => {
    activeRestorers.forEach((restorer) => restorer.leftFullscreenOnPurpose());
    if (!document.fullscreenElement) return Promise.resolve();
    return document.exitFullscreen?.() ?? Promise.resolve();
  }, []);

  const toggle = useCallback(() => {
    const op = document.fullscreenElement ? exit() : enter();
    // Best-effort for UI toggle — swallow rejections (denied, unsupported, etc.)
    op.catch(() => undefined);
  }, [enter, exit]);

  const canFullscreen =
    typeof document !== "undefined" && !!document.documentElement.requestFullscreen;

  useEffect(() => {
    if (!shortcut) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isFullscreenShortcut(event)) return;
      event.preventDefault();
      toggle();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [shortcut, toggle]);

  return { containerRef, isFullscreen, canFullscreen, enter, exit, toggle };
}
