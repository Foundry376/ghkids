export const isTextInput = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && el.type === "text") ||
  (el instanceof HTMLElement && el.isContentEditable);

/**
 * Next display-order for a definition appended to `items`, or `undefined` when
 * none of the existing items carry an explicit order yet. In that case the new
 * item is left unordered so it sorts last by insertion order — this keeps a
 * fresh creation from jumping ahead of as-yet-unordered built-ins. Once any
 * reorder has stamped orders onto the whole group, new items append after the
 * current max.
 */
export function nextOrder(items: { order?: number }[]): number | undefined {
  const orders = items
    .map((item) => item.order)
    .filter((order): order is number => typeof order === "number");
  return orders.length ? Math.max(...orders) + 1 : undefined;
}

export function deepClone<T>(obj: T): T {
  if (!obj) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

export function makeId(
  type:
    | "rule"
    | "condition"
    | "var"
    | "global"
    | "stagevar"
    | "stage"
    | "actor"
    | "character"
    | "appearance"
    | "comment",
) {
  return `${type}:${crypto.randomUUID().split("-")[0]}`;
}
