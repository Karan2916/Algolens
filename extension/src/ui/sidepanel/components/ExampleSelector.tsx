import type { FC } from "react";
import type { ProblemExample } from "../../../shared/types";

interface ExampleSelectorProps {
  examples?: ProblemExample[];
  selectedIndex: number;
  onSelectExample: (index: number) => void;
  isAnalyzing?: boolean;
}

export const ExampleSelector: FC<ExampleSelectorProps> = ({
  examples = [],
  selectedIndex,
  onSelectExample,
  isAnalyzing = false,
}) => {
  if (examples.length === 0) {
    return null;
  }

  const selected = examples[selectedIndex] ?? examples[0];

  return (
    <div
      className="lc-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
      }}
    >
      {/* Header and Example Switcher Pills */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span
          className="lc-section-title"
          style={{ marginBottom: 0, fontSize: 11 }}
        >
          📌 Problem Test Cases ({examples.length})
        </span>

        {/* Switcher Pills */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {examples.map((ex, idx) => {
            const isSelected = selectedIndex === idx;

            return (
              <button
                key={`ex-pill-${ex.id}-${idx}`}
                onClick={() => {
                  if (idx !== selectedIndex) {
                    onSelectExample(idx);
                  }
                }}
                aria-busy={isAnalyzing}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: isSelected ? 700 : 500,
                  borderRadius: 5,
                  border: isSelected
                    ? "1px solid var(--lc-accent-orange)"
                    : "1px solid var(--lc-border)",
                  backgroundColor: isSelected
                    ? "rgba(255, 161, 22, 0.15)"
                    : "var(--lc-bg-primary)",
                  color: isSelected
                    ? "var(--lc-accent-orange)"
                    : "var(--lc-text-secondary)",
                  cursor: isAnalyzing ? "wait" : "pointer",
                  transition: "all 150ms ease",
                }}
              >
                Example {ex.id}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Example Details */}
      {selected && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            padding: "8px 10px",
            backgroundColor: "var(--lc-bg-primary)",
            borderRadius: 6,
            border: "1px solid var(--lc-border)",
            fontSize: 12,
          }}
        >
          {/* Input */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--lc-text-muted)",
                textTransform: "uppercase",
                minWidth: 46,
              }}
            >
              Input:
            </span>
            <code
              style={{
                color: "var(--lc-text-primary)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 11,
                wordBreak: "break-all",
              }}
            >
              {selected.inputText}
            </code>
          </div>

          {/* Expected Output */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--lc-text-muted)",
                textTransform: "uppercase",
                minWidth: 46,
              }}
            >
              Output:
            </span>
            <code
              style={{
                color: "var(--lc-easy)",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 11,
                fontWeight: 600,
                wordBreak: "break-all",
              }}
            >
              {selected.outputText}
            </code>
          </div>

          {/* Explanation (if available) */}
          {selected.explanation && (
            <div
              style={{
                fontSize: 11,
                color: "var(--lc-text-secondary)",
                marginTop: 2,
                borderTop: "1px dashed var(--lc-border)",
                paddingTop: 4,
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: "var(--lc-text-muted)" }}>Note: </strong>
              {selected.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
