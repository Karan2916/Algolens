import { useState } from "react";
import type { FC, ReactNode } from "react";
import type { CodeSnapshot } from "../../../shared/types";
import type { AlgorithmAnalysis } from "../../../ai/types";
import type { AlgorithmConstruct, AlgorithmModel } from "../../../analyzer/types";

interface CodeInsightsTabProps {
  snapshot: CodeSnapshot | null;
  analysis: AlgorithmAnalysis | null;
  model: AlgorithmModel | null;
}

export const CodeInsightsTab: FC<CodeInsightsTabProps> = ({
  snapshot,
  analysis,
  model,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!snapshot?.code) return;
    navigator.clipboard.writeText(snapshot.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderConstruct = (construct: AlgorithmConstruct, key: string): ReactNode => {
    const title = construct.name || construct.dataType || construct.type;
    return (
      <div className="lc-ast-node" key={key}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span>
            <span style={{ color: "var(--lc-violet)", fontWeight: 700 }}>{construct.type}</span>
            {title !== construct.type && <span style={{ color: "var(--lc-text-primary)" }}> · {title}</span>}
          </span>
          <span className="lc-mono" style={{ color: "var(--lc-text-muted)", fontSize: 9 }}>
            L{construct.location.startLine}
          </span>
        </div>
        {construct.semanticType && (
          <div style={{ marginTop: 2, color: "var(--lc-cyan)", fontSize: 10 }}>
            {construct.semanticType}{construct.dataType ? ` · ${construct.dataType}` : ""}
          </div>
        )}
        {construct.operations && construct.operations.length > 0 && (
          <div style={{ marginTop: 3, color: "var(--lc-text-muted)", fontSize: 10 }}>
            {construct.operations.map((operation) => operation.name).join(" · ")}
          </div>
        )}
        {construct.children.length > 0 && (
          <div className="lc-ast-children">
            {construct.children.map((child, index) => renderConstruct(child, `${key}-${index}`))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="lc-two-column">
      {/* Code Viewer Section */}
      <div className="lc-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="lc-section-title" style={{ marginBottom: 0 }}>
              Editor Snapshot
            </span>
            {snapshot?.language && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  padding: "1px 6px",
                  borderRadius: 4,
                  backgroundColor: "var(--lc-bg-tertiary)",
                  color: "var(--lc-text-secondary)",
                  border: "1px solid var(--lc-border-light)",
                }}
              >
                {snapshot.language}
              </span>
            )}
          </div>

          {snapshot?.code && (
            <button
              className="lc-button"
              onClick={handleCopy}
              style={{ padding: "3px 8px", fontSize: 11 }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          )}
        </div>

        {snapshot?.code ? (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12,
              lineHeight: 1.5,
              padding: 12,
              borderRadius: 6,
              backgroundColor: "var(--lc-bg-primary)",
              border: "1px solid var(--lc-border)",
              color: "#e2e8f0",
              maxHeight: 380,
              overflowY: "auto",
            }}
          >
            <code>{snapshot.code}</code>
          </pre>
        ) : (
          <p style={{ fontSize: 12, color: "var(--lc-text-muted)" }}>
            No code captured from the LeetCode editor yet.
          </p>
        )}
      </div>

      <div className="lc-card">
        <span className="lc-section-title">Parsed Algorithm Structure</span>
        {model ? (
          <>
            <div className="lc-mono" style={{ color: "var(--lc-text-muted)", fontSize: 10, marginBottom: 9 }}>
              Tree-sitter · {model.language}
            </div>
            {model.constructs.length > 0 ? (
              <div className="lc-ast-tree">
                {model.constructs.map((construct, index) => renderConstruct(construct, String(index)))}
              </div>
            ) : (
              <div className="lc-unavailable" style={{ minHeight: 100 }}>
                <strong>No constructs identified</strong>
                <span>The parser returned an empty construct model for this snapshot.</span>
              </div>
            )}
          </>
        ) : (
          <div className="lc-unavailable" style={{ minHeight: 120 }}>
            <strong>Parser model unavailable</strong>
            <span>The current language or code snapshot has not produced a parser model.</span>
          </div>
        )}
      </div>
      </div>

      {/* AI Strategy & Rationale Card */}
      {analysis && (
        <div className="lc-card">
          <span className="lc-section-title">Visualizer Insights</span>

          {analysis.visualizationType && (
            <div style={{ marginBottom: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--lc-text-secondary)",
                  display: "block",
                  marginBottom: 2,
                }}
              >
                Mapped Model:
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--lc-blue)",
                }}
              >
                {analysis.visualizationType.toUpperCase()}
              </span>
            </div>
          )}

          {analysis.visualizationReason ? (
            <div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--lc-text-secondary)",
                  display: "block",
                  marginBottom: 2,
                }}
              >
                Why this representation:
              </span>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--lc-text-primary)",
                  lineHeight: 1.4,
                }}
              >
                {analysis.visualizationReason}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "var(--lc-text-muted)" }}>
              Visualization mapped to code control-flow and data-structures.
            </p>
          )}
        </div>
      )}

      <div className="lc-card">
        <span className="lc-section-title">AST Comparison · Unavailable</span>
        <div className="lc-unavailable" style={{ minHeight: 100 }}>
          <strong>No optimized solution AST</strong>
          <span>AlgoLens does not currently generate a separate optimized implementation for comparison.</span>
        </div>
      </div>
    </div>
  );
};
