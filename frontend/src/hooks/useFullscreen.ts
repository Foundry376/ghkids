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
}

/**
 * Tracks and controls fullscreen state for a container element.
 * Returns a ref to attach to the element that should go fullscreen,
 * plus state and toggle/enter/exit helpers.
 */
export function useFullscreen<T extends HTMLElement = HTMLDivElement>({
  target = "element",
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

  return { containerRef, isFullscreen, canFullscreen, enter, exit, toggle };
}
