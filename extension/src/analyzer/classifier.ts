import type { SemanticType } from "./types";

const TYPE_MAP: Record<string, SemanticType> = {
  vector: "array",

  array: "array",

  stack: "stack",

  queue: "queue",

  priority_queue: "queue",

  map: "map",

  unordered_map: "map",

  set: "set",

  unordered_set: "set",
};

export function classifyDataType(
  dataType?: string
): SemanticType | undefined {
  if (!dataType) {
    return undefined;
  }

  return TYPE_MAP[dataType];
}