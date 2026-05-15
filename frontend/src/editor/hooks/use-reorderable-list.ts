import { useCallback, useState } from "react";

const MIME_PREFIX = "application/x-codako-reorder-";

type DropAt = { id: string; side: "before" | "after" };

type ItemReorderProps = {
  onDragStart: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragEnd: (event: React.DragEvent) => void;
  "data-reorder-position"?: "before" | "after";
};

export function useReorderableList(opts: {
  kind: string;
  order: string[];
  onReorder: (newOrder: string[]) => void;
}): {
  getItemProps: (id: string) => ItemReorderProps;
  isReorderDrag: (dt: DataTransfer) => boolean;
} {
  const { kind, order, onReorder } = opts;
  const mime = MIME_PREFIX + kind;
  const [dropAt, setDropAt] = useState<DropAt | null>(null);

  const isReorderDrag = useCallback(
    (dt: DataTransfer) => dt.types.includes(mime),
    [mime],
  );

  const getItemProps = useCallback(
    (id: string): ItemReorderProps => ({
      onDragStart: (event) => {
        event.dataTransfer.setData(mime, id);
      },
      onDragOver: (event) => {
        if (!event.dataTransfer.types.includes(mime)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const side: "before" | "after" =
          event.clientX < rect.left + rect.width / 2 ? "before" : "after";
        setDropAt((prev) =>
          prev && prev.id === id && prev.side === side ? prev : { id, side },
        );
      },
      onDragLeave: () => {
        // Intentionally do nothing; the next item's onDragOver will overwrite,
        // and onDragEnd / onDrop will clear.
      },
      onDrop: (event) => {
        if (!event.dataTransfer.types.includes(mime)) return;
        event.preventDefault();
        event.stopPropagation();
        const sourceId = event.dataTransfer.getData(mime);
        setDropAt(null);
        if (!sourceId || sourceId === id) return;
        if (!order.includes(sourceId) || !order.includes(id)) return;

        const without = order.filter((x) => x !== sourceId);
        let insertIdx = without.indexOf(id);
        if (insertIdx === -1) return;
        const side: "before" | "after" =
          event.clientX < (event.currentTarget as HTMLElement).getBoundingClientRect().left +
            (event.currentTarget as HTMLElement).getBoundingClientRect().width / 2
            ? "before"
            : "after";
        if (side === "after") insertIdx += 1;
        without.splice(insertIdx, 0, sourceId);
        onReorder(without);
      },
      onDragEnd: () => setDropAt(null),
      "data-reorder-position":
        dropAt && dropAt.id === id ? dropAt.side : undefined,
    }),
    [mime, order, onReorder, dropAt],
  );

  return { getItemProps, isReorderDrag };
}
