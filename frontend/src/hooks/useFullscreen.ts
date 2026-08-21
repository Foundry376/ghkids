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
