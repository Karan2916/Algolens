import { useMemo, useState } from "react";
import type { FC } from "react";
import type { ProblemExample } from "../../../shared/types";

interface ExamplesTabProps {
  examples: ProblemExample[];
  selectedIndex: number;
  onSelectExample: (index: number) => void;
}

export const ExamplesTab: FC<ExamplesTabProps> = ({
  examples,
  selectedIndex,
  onSelectExample,
}) => {
  const [filter, setFilter] = useState("");
  const filteredExamples = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return examples
      .map((example, index) => ({ example, index }))
      .filter(({ example }) =>
        !query ||
        `${example.inputText} ${example.outputText} ${example.explanation ?? ""}`
          .toLowerCase()
          .includes(query)
      );
  }, [examples, filter]);

  return (
    <section className="lc-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div className="lc-section-title">Problem Examples</div>
          <p style={{ color: "var(--lc-text-muted)", fontSize: 11 }}>
            Source: examples extracted from the current problem.
          </p>
        </div>
        <span className="lc-mono" style={{ color: "var(--lc-cyan)", fontSize: 11 }}>
          {examples.length} CASES
        </span>
      </div>
      <input
        aria-label="Filter examples"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        placeholder="Filter inputs or outputs…"
        style={{
          width: "100%",
          margin: "12px 0",
          padding: "8px 10px",
          borderRadius: 7,
          border: "1px solid var(--lc-border)",
          background: "var(--lc-bg-primary)",
          color: "var(--lc-text-primary)",
          outlineColor: "var(--lc-cyan)",
        }}
      />
      {filteredExamples.length === 0 ? (
        <div className="lc-unavailable">
          <strong>{examples.length === 0 ? "No examples detected" : "No matching examples"}</strong>
          <span>
            {examples.length === 0
              ? "The current problem page did not expose example input/output pairs."
              : "Try a different search term."}
          </span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {filteredExamples.map(({ example, index }) => (
            <button
              className="lc-example-row"
              key={`${example.id}-${index}`}
              aria-pressed={selectedIndex === index}
              onClick={() => onSelectExample(index)}
            >
              <span style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <strong>Example {example.id}</strong>
                <span className="lc-mono" style={{ color: "var(--lc-cyan)", fontSize: 10 }}>
                  {selectedIndex === index ? "SELECTED" : "USE EXAMPLE"}
                </span>
              </span>
              <span style={{ display: "grid", gridTemplateColumns: "48px minmax(0, 1fr)", gap: "4px 8px" }}>
                <span style={{ color: "var(--lc-text-muted)", fontSize: 10 }}>INPUT</span>
                <code className="lc-mono" style={{ color: "var(--lc-text-primary)", fontSize: 11, overflowWrap: "anywhere" }}>{example.inputText}</code>
                <span style={{ color: "var(--lc-text-muted)", fontSize: 10 }}>OUTPUT</span>
                <code className="lc-mono" style={{ color: "var(--lc-easy)", fontSize: 11, overflowWrap: "anywhere" }}>{example.outputText}</code>
              </span>
              {example.explanation && (
                <span style={{ display: "block", borderTop: "1px solid var(--lc-border)", marginTop: 8, paddingTop: 7, color: "var(--lc-text-secondary)", fontSize: 11 }}>
                  {example.explanation}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
