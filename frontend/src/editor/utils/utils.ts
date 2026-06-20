export const isTextInput = (el: EventTarget | null) =>
  el instanceof HTMLTextAreaElement ||
  (el instanceof HTMLInputElement && el.type === "text") ||
  (el instanceof HTMLElement && el.isContentEditable);

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
