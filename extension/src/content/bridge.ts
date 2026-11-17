import { MESSAGE_SOURCE, MESSAGE_TYPE } from "../shared/messages";

window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const message = event.data;

  if (!message) return;

  if (message.source !== MESSAGE_SOURCE) return;
  if (message.type !== MESSAGE_TYPE.CODE_UPDATE) return;

  console.log("📨 Received Snapshot");
  console.log(message.payload);

  chrome.runtime.sendMessage(message, (response) => {
    console.log("📤 Sent to background");
    console.log("📦 Background Response:", response);

    if (chrome.runtime.lastError) {
      console.error(
        "❌ Runtime Error:",
        chrome.runtime.lastError.message
      );
    }
  });
});