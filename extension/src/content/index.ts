
import {
  MESSAGE_SOURCE,
  MESSAGE_TYPE,
} from "../shared/messages";
import { extractProblem } from "./extractProblem";

let lastProblemKey = "";

function mountOverlay(): void {
  if (document.getElementById("algolens-overlay-host")) return;

  const host = document.createElement("div");
  host.id = "algolens-overlay-host";
  host.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;pointer-events:none;";

  const shadow = host.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = `
    iframe {
      position: fixed; top: 20px; right: 20px; width: min(440px, calc(100vw - 32px));
      height: 190px; border: 0; border-radius: 12px; background: #111319;
      box-shadow: 0 16px 48px rgba(0,0,0,.48); resize: both; overflow: hidden;
      pointer-events: auto; transition: width 180ms ease, height 180ms ease;
    }
    button {
      position: fixed; right: 20px; bottom: 20px; display: none; pointer-events: auto;
      border: 1px solid #6d5aa8; border-radius: 10px; padding: 10px 14px;
      background: #191b22; color: #f8fafc; font: 600 13px Inter, sans-serif;
      box-shadow: 0 8px 26px rgba(0,0,0,.42); cursor: pointer;
    }
    @media (max-width: 520px) {
      iframe { top: 8px; right: 8px; width: calc(100vw - 16px); }
      button { right: 12px; bottom: 12px; }
    }
  `;
  const frame = document.createElement("iframe");
  frame.title = "AlgoLens algorithm visualizer";
  frame.src = chrome.runtime.getURL("src/ui/sidepanel/index.html?mode=overlay");
  frame.allow = "clipboard-read; clipboard-write";
  const launcher = document.createElement("button");
  launcher.type = "button";
  launcher.textContent = "⚡ Open AlgoLens";

  launcher.addEventListener("click", () => {
    frame.style.display = "block";
    frame.style.height = "190px";
    frame.style.width = "min(440px, calc(100vw - 32px))";
    launcher.style.display = "none";
    frame.contentWindow?.postMessage(
      { source: "algolens-overlay-host", type: "RESTORE" },
      new URL(chrome.runtime.getURL("")).origin
    );
  });

  window.addEventListener("message", (event) => {
    if (event.source !== frame.contentWindow) return;
    if (event.origin !== new URL(chrome.runtime.getURL("")).origin) return;
    if (event.data?.source !== "algolens-overlay-ui") return;

    switch (event.data.type) {
      case "MINIMIZE":
        frame.style.height = "100px";
        frame.style.width = "min(370px, calc(100vw - 32px))";
        frame.contentWindow?.postMessage(
          { source: "algolens-overlay-host", type: "COMPACT" },
          event.origin
        );
        break;
      case "EXPAND":
        frame.style.height = "min(760px, calc(100vh - 40px))";
        frame.style.width = "min(780px, calc(100vw - 40px))";
        frame.contentWindow?.postMessage(
          { source: "algolens-overlay-host", type: "EXPANDED" },
          event.origin
        );
        break;
      case "MAXIMIZE":
        frame.style.top = "5vh";
        frame.style.right = "5vw";
        frame.style.width = "90vw";
        frame.style.height = "90vh";
        frame.contentWindow?.postMessage(
          { source: "algolens-overlay-host", type: "EXPANDED" },
          event.origin
        );
        break;
      case "DOCK":
        frame.style.left = frame.style.left ? "" : "20px";
        frame.style.right = frame.style.left ? "" : "20px";
        break;
      case "CLOSE":
        frame.style.display = "none";
        launcher.style.display = "block";
        break;
      case "RESTORE":
        frame.style.display = "block";
        frame.style.height = "min(760px, calc(100vh - 40px))";
        frame.style.width = "min(780px, calc(100vw - 40px))";
        launcher.style.display = "none";
        frame.contentWindow?.postMessage(
          { source: "algolens-overlay-host", type: "EXPANDED" },
          event.origin
        );
        break;
    }
  });

  shadow.append(style, frame, launcher);
  document.documentElement.appendChild(host);
}

function sendProblemUpdate(): void {
  const problem = extractProblem();

  if (!problem) return;

  const problemKey = `${problem.title}|${problem.description}`;

  // Avoid sending the same problem repeatedly.
  if (problemKey === lastProblemKey) return;

  lastProblemKey = problemKey;

  chrome.runtime.sendMessage({
    source: MESSAGE_SOURCE,
    version: 1,
    type: MESSAGE_TYPE.PROBLEM_UPDATE,
    timestamp: Date.now(),
    payload: problem,
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(
        "AlgoLens problem update error:",
        chrome.runtime.lastError.message
      );
      return;
    }

    console.log("AlgoLens problem update response:", response);
  });
}

mountOverlay();

// Receive code snapshots from the page-world Monaco adapter.
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const message = event.data;

  if (!message) return;
  if (message.source !== MESSAGE_SOURCE) return;
  if (message.type !== MESSAGE_TYPE.CODE_UPDATE) return;

  console.log("AlgoLens received code snapshot:", message.payload);

  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error(
        "AlgoLens code update error:",
        chrome.runtime.lastError.message
      );
      return;
    }

    console.log("AlgoLens code update response:", response);
  });
});

// Try immediately, then retry while the problem page finishes rendering.
sendProblemUpdate();

let attempts = 0;

const problemTimer = window.setInterval(() => {
  attempts += 1;
  sendProblemUpdate();

  if (lastProblemKey || attempts >= 20) {
    window.clearInterval(problemTimer);
  }
}, 1000);

// LeetCode navigation may change the problem without a full page reload.
window.addEventListener("popstate", () => {
  lastProblemKey = "";
  window.setTimeout(sendProblemUpdate, 500);
});
