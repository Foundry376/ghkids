import { useEffect } from "react";

/**
 * Hides the Google reCAPTCHA v3 badge while the component is mounted.
 * The badge reappears when the component unmounts.
 */
export function useHideRecaptchaBadge() {
  useEffect(() => {
    const badge = document.querySelector<HTMLElement>(".grecaptcha-badge");
    if (badge) {
      badge.style.visibility = "hidden";
    }
    return () => {
      const badge = document.querySelector<HTMLElement>(".grecaptcha-badge");
      if (badge) {
        badge.style.visibility = "visible";
      }
    };
  }, []);
}
