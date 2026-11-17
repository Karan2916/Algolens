import type { FC } from "react";
import type { VisualizationStep } from "../../../ai/types";

interface StepTraceTabProps {
  steps: VisualizationStep[];
  currentStepIndex: number;
  onSeek: (index: number) => void;
}

export const StepTraceTab: FC<StepTraceTabProps> = ({
  steps,
  currentStepIndex,
  onSeek,
}) => (
  <section className="lc-card">
    <div className="lc-section-title">Execution Trace</div>
    <p style={{ color: "var(--lc-text-muted)", fontSize: 11, marginBottom: 10 }}>
      AI-generated illustrative steps from the selected example.
    </p>
    {steps.length === 0 ? (
      <div className="lc-unavailable">
        <strong>No trace available yet</strong>
        <span>Analyze the current solution to generate an illustrative step trace.</span>
      </div>
    ) : (
      <div className="lc-step-list">
        {steps.map((step, index) => (
          <button
            className="lc-step-row"
            key={`${index}-${step.operation ?? "step"}`}
            aria-current={index === currentStepIndex ? "step" : undefined}
            onClick={() => onSeek(index)}
          >
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span className="lc-mono" style={{ color: "var(--lc-cyan)", fontSize: 10 }}>
                {String(index + 1).padStart(2, "0")}
                {step.line !== undefined ? ` · L${step.line}` : ""}
              </span>
              {step.operation && (
                <span style={{ color: "var(--lc-text-muted)", fontSize: 10 }}>
                  {step.operation}
                </span>
              )}
            </span>
            <span style={{ display: "block", marginTop: 3, fontSize: 12 }}>
              {step.message}
            </span>
          </button>
        ))}
      </div>
    )}
  </section>
);
