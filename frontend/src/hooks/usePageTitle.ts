import { useEffect } from "react";

const DEFAULT_TITLE = "Codako - Create your own games!";

/**
 * Sets the document title, optionally with a prefix.
 * Restores the default title when the component unmounts.
 *
 * @param title - The title to display (e.g., world name). If provided, shows "Codako - {title}"
 */
export function usePageTitle(title: string | undefined | null) {
  useEffect(() => {
    if (title) {
      document.title = `Codako - ${title}`;
    }
    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [title]);
}
