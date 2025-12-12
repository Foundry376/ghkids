export function deepClone<T>(obj: T): T {
  if (!obj) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

export function makeId(
  type: "rule" | "condition" | "var" | "global" | "stage" | "actor" | "character" | "appearance",
) {
  return `${type}:${crypto.randomUUID().split("-")[0]}`;
}
