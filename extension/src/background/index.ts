
import type { CodeSnapshot, Problem } from "../shared/types";
import { MESSAGE_TYPE } from "../shared/messages";
import { processSnapshot, reanalyzeExample } from "./parserService";

console.log("AlgoLens Background Worker Started");

chrome.runtime.onInstalled.addListener(() => {
  console.log("AlgoLens Installed");
});

chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    console.log("Background received:", message);

    switch (message.type) {
      case MESSAGE_TYPE.CODE_UPDATE: {
        const snapshot = message.payload as CodeSnapshot;

        chrome.storage.local
          .set({ codeSnapshot: snapshot })
          .then(() => {
            console.log("Code Snapshot Saved");

            // Keep the existing parsing and AI analysis pipeline.
            processSnapshot(snapshot);

            sendResponse({
              success: true,
              parsed: false,
            });
          })
          .catch((error: unknown) => {
            console.error("Failed to save code snapshot:", error);
            sendResponse({ success: false });
          });

        return true;
      }

      case MESSAGE_TYPE.PROBLEM_UPDATE: {
        const problem = message.payload as Problem;

        chrome.storage.local
          .set({ problem, selectedExampleIndex: 0 })
          .then(() => {
            console.log("Problem Saved:", problem.title);
            return reanalyzeExample(0);
          })
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error: unknown) => {
            console.error("Failed to save problem:", error);
            sendResponse({ success: false });
          });

        return true;
      }

      case MESSAGE_TYPE.SELECT_EXAMPLE: {
        const payload = message.payload as { index: number } | undefined;
        const exampleIndex = payload?.index ?? 0;

        chrome.storage.local
          .set({ selectedExampleIndex: exampleIndex })
          .then(() => {
            return reanalyzeExample(exampleIndex);
          })
          .then(() => {
            sendResponse({ success: true });
          })
          .catch((error: unknown) => {
            console.error("Failed to reanalyze selected example:", error);
            sendResponse({ success: false, error: String(error) });
          });

        return true;
      }

      case MESSAGE_TYPE.RETRY_OPTIMAL: {
        chrome.storage.local
          .get("selectedExampleIndex")
          .then((stored) =>
            reanalyzeExample(
              typeof stored.selectedExampleIndex === "number"
                ? stored.selectedExampleIndex
                : 0,
              { retryOptimal: true }
            )
          )
          .then(() => sendResponse({ success: true }))
          .catch((error: unknown) => {
            console.error("Failed to retry independent optimal analysis:", error);
            sendResponse({ success: false, error: String(error) });
          });

        return true;
      }

      default: {
        console.warn("Unknown message type:", message.type);
        sendResponse({ success: false });
        return false;
      }
    }
  }
);
