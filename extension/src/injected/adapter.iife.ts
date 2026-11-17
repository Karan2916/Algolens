import { MESSAGE_SOURCE, MESSAGE_TYPE } from "../shared/messages";

const timer = setInterval(() => {
  const editors = window.monaco?.editor?.getEditors();

  if (!editors?.length) return;

  clearInterval(timer);

  const editor = editors[0];

  const sendSnapshot = () => {
    const model = editor.getModel();

    if (!model) return;

    const snapshot = {
      code: model.getValue(),
      language: model.getLanguageId(),
      timestamp: Date.now(),
    };

    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        version: 1,
        type: MESSAGE_TYPE.CODE_UPDATE,
        timestamp: Date.now(),
        payload: snapshot,
      },
      "*"
    );
  };

  // Initial snapshot
  sendSnapshot();

  // Update whenever the user changes the code
  editor.onDidChangeModelContent(() => {
    sendSnapshot();
  });

  console.log("✅ AlgoLens Monaco Adapter Ready");
}, 500);