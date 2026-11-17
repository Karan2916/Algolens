// Who sent the message?
export const MESSAGE_SOURCE = "algolens" as const;

// Every message type in AlgoLens
export const MESSAGE_TYPE = {
  PAGE_READY: "PAGE_READY",
  CODE_UPDATE: "CODE_UPDATE",
  PROBLEM_UPDATE: "PROBLEM_UPDATE",
  LANGUAGE_UPDATE: "LANGUAGE_UPDATE",
  SELECT_EXAMPLE: "SELECT_EXAMPLE",
  RETRY_OPTIMAL: "RETRY_OPTIMAL",
} as const;

// Convenient type
export type MessageType =
  (typeof MESSAGE_TYPE)[keyof typeof MESSAGE_TYPE];

// Generic message interface
export interface AlgoLensMessage<T = unknown> {
  source: typeof MESSAGE_SOURCE;
  version: 1;
  type: MessageType;
  timestamp: number;
  payload: T;
}