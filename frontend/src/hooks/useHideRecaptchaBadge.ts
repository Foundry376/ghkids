import { useEffect } from "react";

/**
 * Hides the Google reCAPTCHA v3 badge while the component is mounted.
 * The badge reappears when the component unmounts.
 *
 * Uses a MutationObserver to handle the case where the badge is injected
 * asynchronously after the component mounts.
 */
export function useHideRecaptchaBadge() {
  useEffect(() => {
    const hide = (badge: HTMLElement) => {
      badge.style.visibility = "hidden";
    };

    const badge = document.querySelector<HTMLElement>(".grecaptcha-badge");
    if (badge) {
      hide(badge);
      return () => {
        badge.style.visibility = "visible";
      };
    }

    // Badge not yet in the DOM — watch for it
    const observer = new MutationObserver(() => {
      const badge = document.querySelector<HTMLElement>(".grecaptcha-badge");
      if (badge) {
        hide(badge);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      const badge = document.querySelector<HTMLElement>(".grecaptcha-badge");
      if (badge) {
        badge.style.visibility = "visible";
      }
    };
  }, []);
}
