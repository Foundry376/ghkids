import { useCallback, useEffect, useState } from "react";

export function useDismissibleMenu(menuId: string) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  useEffect(() => {
    if (!open) return;

    const dismissOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest(`[data-dismissible-menu="${menuId}"]`)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", dismissOutside, true);
    return () => document.removeEventListener("pointerdown", dismissOutside, true);
  }, [menuId, open]);

  return {
    open,
    toggle,
    menuProps: { "data-dismissible-menu": menuId },
  };
}
