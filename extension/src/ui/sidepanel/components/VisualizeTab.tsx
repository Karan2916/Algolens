import type { FC } from "react";
import type {
  OptimalExecution,
  VisualizationPlan,
  VisualizationState,
  VisualizationStep,
} from "../../../ai/types";
import type { ProblemExample } from "../../../shared/types";
import VisualizationRenderer from "../VisualizationRenderer";
import { PlaybackControls } from "./PlaybackControls";
import { ExampleSelector } from "./ExampleSelector";

interface VisualizeTabProps {
  visualizationPlan?: VisualizationPlan;
  algorithm?: string;
  language?: string;
  explanation?: string;
  complexity?: { time?: string; space?: string };
  steps: VisualizationStep[];
  currentStepIndex: number;
  currentStep?: VisualizationStep;
  currentState?: VisualizationState;
  myExecutionAvailable: boolean;
  myExecutionUnavailableReason?: string;
  analysisError?: string;
  optimalExecutionError?: string;
  optimalExecution?: OptimalExecution;
  optimalPlan?: VisualizationPlan;
  optimalSteps: VisualizationStep[];
  optimalStepIndex: number;
  optimalCurrentStep?: VisualizationStep;
  optimalCurrentState?: VisualizationState;
  isPlaying: boolean;
  isOptimalPlaying: boolean;
  synchronizePlayback: boolean;
  onSynchronizePlaybackChange: (enabled: boolean) => void;
  examples?: ProblemExample[];
  selectedExampleIndex?: number;
  onSelectExample?: (index: number) => void;
  isAnalyzing?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  onOptimalPrevious: () => void;
  onOptimalNext: () => void;
  onOptimalTogglePlay: () => void;
  onOptimalReset: () => void;
  onOptimalSeek: (index: number) => void;
  onRetryOptimal: () => void;
}

function displayValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "unknown";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

interface ExecutionPanelProps {
  title: string;
  tone: "my" | "optimal";
  plan?: VisualizationPlan;
  algorithm?: string;
  language?: string;
  explanation?: string;
  complexity?: { time?: string; space?: string };
  steps: VisualizationStep[];
  currentStepIndex: number;
  currentStep?: VisualizationStep;
  currentState?: VisualizationState;
  available: boolean;
  unavailableReason?: string;
  isAnalyzing: boolean;
  isPlaying: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  onRetry?: () => void;
}

const ExecutionPanel: FC<ExecutionPanelProps> = ({
  title,
  tone,
  plan,
  algorithm,
  language,
  explanation,
  complexity,
  steps,
  currentStepIndex,
  currentStep,
  currentState,
  available,
  unavailableReason,
  isAnalyzing,
  isPlaying,
  onPrevious,
  onNext,
  onTogglePlay,
  onReset,
  onSeek,
  onRetry,
}) => {
  const isOptimal = tone === "optimal";
  return (
    <section
      className={`lc-card lc-execution-card${isOptimal ? " lc-execution-card-optimal" : ""}`}
      aria-label={title}
    >
      <header style={{ marginBottom: 8 }}>
        <div className="lc-section-title">
          {title} <span className="lc-mono" style={{ fontSize: 9 }}>· AI-ILLUSTRATIVE</span>
        </div>
        {plan && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", fontSize: 13, color: "var(--lc-text-primary)" }}>
                {plan.title}
              </strong>
              <p style={{ marginTop: 3, fontSize: 11, color: "var(--lc-text-secondary)" }}>
                {plan.reason}
              </p>
            </div>
            <span className="lc-mono" style={{ fontSize: 9, color: isOptimal ? "var(--lc-cyan)" : "var(--lc-violet)" }}>
              {plan.type.replace(/_/g, " ").toUpperCase()}
            </span>
          </div>
        )}
        {algorithm && (
          <div className="lc-mono" style={{ marginTop: 4, color: isOptimal ? "var(--lc-cyan)" : "#c4b5fd", fontSize: 10 }}>
            Algorithm: {algorithm}
          </div>
        )}
        {language && (
          <div className="lc-mono" style={{ marginTop: 3, color: "var(--lc-text-muted)", fontSize: 9 }}>
            Language: {language}
          </div>
        )}
        {explanation && (
          <p style={{ marginTop: 4, color: "var(--lc-text-secondary)", fontSize: 10 }}>
            {explanation}
          </p>
        )}
        {complexity && (
          <div className="lc-mono" style={{ display: "flex", gap: 10, marginTop: 6, color: "var(--lc-text-muted)", fontSize: 10 }}>
            <span>TIME <strong style={{ color: isOptimal ? "var(--lc-cyan)" : "#c4b5fd" }}>{complexity.time ?? "Unavailable"}</strong></span>
            <span>SPACE <strong style={{ color: isOptimal ? "var(--lc-cyan)" : "#c4b5fd" }}>{complexity.space ?? "Unavailable"}</strong></span>
          </div>
        )}
      </header>

      {plan?.completion?.status === "completed" && (
        <div style={{
          marginBottom: 8,
          padding: "7px 9px",
          borderRadius: 6,
          border: `1px solid ${isOptimal ? "rgba(6,182,212,.35)" : "rgba(139,92,246,.35)"}`,
          background: isOptimal ? "rgba(6,182,212,.07)" : "rgba(139,92,246,.07)",
          fontSize: 11,
        }}>
          <strong>Completed · Return value: </strong>
          <code className="lc-mono">{displayValue(plan.completion.returnValue)}</code>
        </div>
      )}

      {steps.length > 0 && available && (
        <PlaybackControls
          currentStepIndex={currentStepIndex}
          totalSteps={steps.length}
          isPlaying={isPlaying}
          onPrevious={onPrevious}
          onNext={onNext}
          onTogglePlay={onTogglePlay}
          onReset={onReset}
          onSeek={onSeek}
        />
      )}

      {currentStep && available && (
        <div style={{
          margin: "8px 0",
          padding: "8px 10px",
          borderRadius: 7,
          border: `1px solid ${isOptimal ? "rgba(6,182,212,.32)" : "rgba(139,92,246,.32)"}`,
          borderLeft: `3px solid ${isOptimal ? "var(--lc-cyan)" : "var(--lc-violet)"}`,
          background: "rgba(12,14,20,.62)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
            <strong style={{ color: isOptimal ? "var(--lc-cyan)" : "#c4b5fd", fontSize: 10, textTransform: "uppercase" }}>
              Step {currentStepIndex + 1} · {currentStep.operation ?? "operation"}
            </strong>
            {currentStep.line !== undefined && (
              <span className="lc-mono" style={{ color: "var(--lc-text-muted)", fontSize: 9 }}>
                line {currentStep.line}
              </span>
            )}
          </div>
          <p style={{ fontSize: 11 }}>{currentStep.message}</p>
        </div>
      )}

      {currentState && available ? (
        <VisualizationRenderer state={currentState} visualizationType={plan?.type} />
      ) : isAnalyzing ? (
        <div className="lc-unavailable" aria-live="polite">
          <strong>Preparing {isOptimal ? "independent optimal" : "submitted-code"} trace…</strong>
          <span>Only states associated with the selected code and example will be displayed.</span>
        </div>
      ) : !available ? (
        <div className="lc-unavailable" role="status">
          <strong>{isOptimal ? "Optimal Execution unavailable" : "My Execution unavailable"}</strong>
          <span>{unavailableReason || "A reliable illustrative trace could not be generated for this selection."}</span>
          {isOptimal && onRetry && !isAnalyzing && (
            <button className="lc-button" onClick={onRetry}>
              Retry Optimal Analysis
            </button>
          )}
        </div>
      ) : (
        <div className="lc-unavailable">
          <strong>No visualization state is available</strong>
          <span>The generated plan contains no renderable state for this step.</span>
        </div>
      )}
    </section>
  );
};

export const VisualizeTab: FC<VisualizeTabProps> = ({
  visualizationPlan,
  algorithm,
  language,
  explanation,
  complexity,
  steps,
  currentStepIndex,
  currentStep,
  currentState,
  myExecutionAvailable,
  myExecutionUnavailableReason,
  analysisError,
  optimalExecutionError,
  optimalExecution,
  optimalPlan,
  optimalSteps,
  optimalStepIndex,
  optimalCurrentStep,
  optimalCurrentState,
  isPlaying,
  isOptimalPlaying,
  synchronizePlayback,
  onSynchronizePlaybackChange,
  examples = [],
  selectedExampleIndex = 0,
  onSelectExample,
  isAnalyzing = false,
  onPrevious,
  onNext,
  onTogglePlay,
  onReset,
  onSeek,
  onOptimalPrevious,
  onOptimalNext,
  onOptimalTogglePlay,
  onOptimalReset,
  onOptimalSeek,
  onRetryOptimal,
}) => {
  const myAvailable =
    myExecutionAvailable && Boolean(visualizationPlan && steps.length > 0);
  const optimalAvailable =
    Boolean(optimalExecution?.available && optimalPlan && optimalSteps.length > 0);
  const optimalUnavailableReason =
    optimalExecution?.unavailableReason ??
    (optimalExecution?.available
      ? "The independent approach did not include a renderable trace."
      : undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {examples.length > 0 && onSelectExample && (
        <ExampleSelector
          examples={examples}
          selectedIndex={selectedExampleIndex}
          onSelectExample={onSelectExample}
          isAnalyzing={isAnalyzing}
        />
      )}

      <label style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        alignSelf: "flex-start",
        color: "var(--lc-text-secondary)",
        fontSize: 11,
        cursor: "pointer",
      }}>
        <input
          type="checkbox"
          checked={synchronizePlayback}
          onChange={(event) => onSynchronizePlaybackChange(event.target.checked)}
        />
        Synchronize playback (each trace advances independently)
      </label>

      <div className="lc-two-column">
        <ExecutionPanel
          title="My Execution"
          tone="my"
          plan={visualizationPlan}
          algorithm={algorithm}
          language={language}
          explanation={explanation}
          complexity={complexity}
          steps={steps}
          currentStepIndex={currentStepIndex}
          currentStep={currentStep}
          currentState={currentState}
          available={myAvailable}
          unavailableReason={
            myExecutionUnavailableReason ??
            analysisError ??
            (!visualizationPlan && !isAnalyzing
              ? "No code-specific trace is available for this source snapshot and selected example."
              : undefined)
          }
          isAnalyzing={isAnalyzing && !visualizationPlan}
          isPlaying={isPlaying}
          onPrevious={onPrevious}
          onNext={onNext}
          onTogglePlay={onTogglePlay}
          onReset={onReset}
          onSeek={onSeek}
        />

        <ExecutionPanel
          title="Optimal Execution"
          tone="optimal"
          plan={optimalPlan}
          algorithm={optimalExecution?.algorithm}
          language={optimalExecution?.language}
          explanation={optimalExecution?.explanation}
          complexity={optimalExecution?.complexity}
          steps={optimalSteps}
          currentStepIndex={optimalStepIndex}
          currentStep={optimalCurrentStep}
          currentState={optimalCurrentState}
          available={optimalAvailable}
          unavailableReason={
            optimalExecutionError ??
            optimalUnavailableReason ??
            (analysisError
              ? `Independent analysis could not be completed: ${analysisError}`
              : undefined)
          }
          isAnalyzing={isAnalyzing}
          isPlaying={isOptimalPlaying}
          onPrevious={onOptimalPrevious}
          onNext={onOptimalNext}
          onTogglePlay={onOptimalTogglePlay}
          onReset={onOptimalReset}
          onSeek={onOptimalSeek}
          onRetry={onRetryOptimal}
        />
      </div>
      <p style={{ textAlign: "center", color: "var(--lc-text-muted)", fontSize: 10 }}>
        Both panels are AI-generated illustrative simulations, not executions of the submitted code.
      </p>
    </div>
  );
};
