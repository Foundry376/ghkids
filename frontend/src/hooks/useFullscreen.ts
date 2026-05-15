import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks and controls fullscreen state for a container element.
 * Returns a ref to attach to the element that should go fullscreen,
 * plus state and toggle/enter/exit helpers.
 */
export function useFullscreen<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const enter = useCallback((): Promise<void> => {
    return containerRef.current?.requestFullscreen?.() ?? Promise.reject(new Error("Fullscreen not supported"));
  }, []);

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
