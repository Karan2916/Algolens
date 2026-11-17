import type { FC } from "react";
import type { AlgorithmAnalysis } from "../../../ai/types";

interface AnalysisTabProps {
  analysis: AlgorithmAnalysis;
}

export const AnalysisTab: FC<AnalysisTabProps> = ({ analysis }) => {
  const confidencePercent = Math.round((analysis.confidence ?? 0) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Algorithm Overview Card */}
      <div className="lc-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div>
            <span className="lc-section-title" style={{ marginBottom: 4 }}>
              Identified Algorithm
            </span>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--lc-text-primary)",
              }}
            >
              {analysis.algorithm}
            </h3>
            {analysis.variant && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--lc-text-secondary)",
                }}
              >
                Variant: {analysis.variant}
              </span>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                backgroundColor:
                  confidencePercent >= 80
                    ? "var(--lc-easy-bg)"
                    : confidencePercent >= 50
                    ? "var(--lc-medium-bg)"
                    : "var(--lc-hard-bg)",
                color:
                  confidencePercent >= 80
                    ? "var(--lc-easy)"
                    : confidencePercent >= 50
                    ? "var(--lc-medium)"
                    : "var(--lc-hard)",
                border: "1px solid currentColor",
              }}
            >
              {confidencePercent}% confidence
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div style={{ marginTop: 10 }}>
          <span className="lc-section-title">Explanation</span>
          <p
            style={{
              fontSize: 13,
              color: "var(--lc-text-primary)",
              lineHeight: 1.5,
              whiteSpace: "pre-line",
            }}
          >
            {analysis.explanation}
          </p>
        </div>
      </div>

      {/* Techniques Section */}
      <div className="lc-card">
        <span className="lc-section-title">Algorithmic Techniques</span>
        {analysis.techniques && analysis.techniques.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              marginTop: 4,
            }}
          >
            {analysis.techniques.map((technique, index) => (
              <span
                key={`${technique}-${index}`}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "4px 9px",
                  borderRadius: 6,
                  backgroundColor: "var(--lc-bg-tertiary)",
                  color: "var(--lc-text-primary)",
                  border: "1px solid var(--lc-border-light)",
                }}
              >
                {technique}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--lc-text-muted)" }}>
            No specific techniques highlighted.
          </p>
        )}
      </div>

      {/* Data Structures Section */}
      <div className="lc-card">
        <span className="lc-section-title">Data Structures</span>
        {analysis.dataStructures && analysis.dataStructures.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            {analysis.dataStructures.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  backgroundColor: "var(--lc-bg-primary)",
                  border: "1px solid var(--lc-border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <code
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--lc-accent-orange)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      backgroundColor: "rgba(255, 161, 22, 0.1)",
                    }}
                  >
                    {item.name}
                  </code>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--lc-text-secondary)",
                      fontStyle: "italic",
                    }}
                  >
                    ({item.type})
                  </span>
                </div>
                <p style={{ fontSize: 12, color: "var(--lc-text-primary)" }}>
                  {item.role}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--lc-text-muted)" }}>
            No specialized data structures identified.
          </p>
        )}
      </div>

      {/* Tracked Variables (if present) */}
      {analysis.variablesToTrack && analysis.variablesToTrack.length > 0 && (
        <div className="lc-card">
          <span className="lc-section-title">Tracked Variables</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {analysis.variablesToTrack.map((v, index) => (
              <div
                key={`${v.name}-${index}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  padding: "6px 8px",
                  borderRadius: 4,
                  backgroundColor: "var(--lc-bg-primary)",
                  border: "1px solid var(--lc-border)",
                }}
              >
                <code
                  style={{
                    color: "var(--lc-blue)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {v.name}
                </code>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--lc-text-secondary)",
                    maxWidth: "70%",
                    textAlign: "right",
                  }}
                >
                  {v.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
