import type { FC } from "react";
import type { AlgorithmAnalysis } from "../../../ai/types";

interface ComplexityTabProps {
  analysis: AlgorithmAnalysis;
}

export const ComplexityTab: FC<ComplexityTabProps> = ({ analysis }) => {
  const timeComplexity = analysis.complexity?.time || "Not specified";
  const spaceComplexity = analysis.complexity?.space || "Not specified";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Time Complexity Card */}
      <div
        className="lc-card"
        style={{
          borderLeft: "4px solid var(--lc-accent-orange)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span className="lc-section-title" style={{ marginBottom: 0 }}>
            ⏱ Time Complexity
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "rgba(255, 161, 22, 0.12)",
              color: "var(--lc-accent-orange)",
              border: "1px solid rgba(255, 161, 22, 0.25)",
            }}
          >
            Asymptotic
          </span>
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            color: "var(--lc-text-primary)",
            margin: "6px 0 10px 0",
            letterSpacing: "-0.02em",
          }}
        >
          {timeComplexity}
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--lc-text-secondary)",
            lineHeight: 1.4,
          }}
        >
          AI-estimated asymptotic growth from the analyzed solution; this is not a measured runtime.
        </p>
      </div>

      {/* Space Complexity Card */}
      <div
        className="lc-card"
        style={{
          borderLeft: "4px solid var(--lc-blue)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span className="lc-section-title" style={{ marginBottom: 0 }}>
            💾 Space Complexity
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "var(--lc-blue-bg)",
              color: "var(--lc-blue)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            Memory
          </span>
        </div>

        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            color: "var(--lc-text-primary)",
            margin: "6px 0 10px 0",
            letterSpacing: "-0.02em",
          }}
        >
          {spaceComplexity}
        </div>

        <p
          style={{
            fontSize: 12,
            color: "var(--lc-text-secondary)",
            lineHeight: 1.4,
          }}
        >
          Represents the auxiliary memory allocated by data structures, recursion stack frames, and working buffers.
        </p>
      </div>

      <div className="lc-card">
        <span className="lc-section-title">Runtime Benchmark · Unavailable</span>
        <div className="lc-unavailable" style={{ minHeight: 100 }}>
          <strong>No execution measurements</strong>
          <span>
            AlgoLens analyzes complexity but does not execute this code or collect runtime, memory, or percentile benchmarks.
          </span>
        </div>
      </div>
    </div>
  );
};
