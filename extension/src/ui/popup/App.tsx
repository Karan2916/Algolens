export default function App() {
  const pingBackground = () => {
    chrome.runtime.sendMessage(
      { type: "PING" },
      (response) => {
        console.log(response);
      }
    );
  };

  return (
    <div style={{ padding: 20, width: 280 }}>
      <h2>AlgoLens</h2>

      <p>Chrome Extension is running.</p>

      <button onClick={pingBackground}>
        Ping Background
      </button>
    </div>
  );
}