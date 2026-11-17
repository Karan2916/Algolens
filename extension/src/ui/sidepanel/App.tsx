import { useEffect, useRef, useState } from "react";
import type { CodeSnapshot, Problem } from "../../shared/types";
import type { AlgorithmAnalysis } from "../../ai/types";
import type { AlgorithmModel } from "../../analyzer/types";
import {
  getAnalysisContextKey,
  getAnalysisForContext,
} from "../../ai/analysisContext";
import { resolveVisualizationState } from "./resolveVisualizationState";
import { Header } from "./components/Header";
import { TabBar, type TabKey } from "./components/TabBar";
import { VisualizeTab } from "./components/VisualizeTab";
import { AnalysisTab } from "./components/AnalysisTab";
import { ComplexityTab } from "./components/ComplexityTab";
import { CodeInsightsTab } from "./components/CodeInsightsTab";
import { StepTraceTab } from "./components/StepTraceTab";
import { ExamplesTab } from "./components/ExamplesTab";
import { EmptyState } from "./components/States";

function isCodeSnapshot(value: unknown): value is CodeSnapshot {
  if (!value || typeof value !== "object") {
    return false;
  }

  const snapshot = value as Record<string, unknown>;

  return (
    typeof snapshot.code === "string" &&
    typeof snapshot.language === "string"
  );
}

function isProblem(value: unknown): value is Problem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const problem = value as Record<string, unknown>;

  return typeof problem.title === "string";
}

function isAlgorithmAnalysis(
  value: unknown
): value is AlgorithmAnalysis {
  if (!value || typeof value !== "object") {
    return false;
  }

  const analysis = value as Record<string, unknown>;

  return (
    typeof analysis.algorithm === "string" &&
    typeof analysis.explanation === "string" &&
    typeof analysis.confidence === "number" &&
    Array.isArray(analysis.techniques) &&
    Array.isArray(analysis.dataStructures) &&
    typeof analysis.complexity === "object" &&
    analysis.complexity !== null
  );
}

function isAlgorithmModel(value: unknown): value is AlgorithmModel {
  if (!value || typeof value !== "object") return false;
  const model = value as Record<string, unknown>;
  return typeof model.language === "string" && Array.isArray(model.constructs);
}

export default function App() {
  const overlayMode =
    new URLSearchParams(window.location.search).get("mode") === "overlay";
  const [problem, setProblem] = useState<Problem | null>(null);
  const [snapshot, setSnapshot] = useState<CodeSnapshot | null>(null);
  const [analysis, setAnalysis] = useState<AlgorithmAnalysis | null>(null);
  const [algorithmModel, setAlgorithmModel] = useState<AlgorithmModel | null>(null);
  const [algorithmModelCode, setAlgorithmModelCode] = useState<string | null>(null);
  const [algorithmModelLanguage, setAlgorithmModelLanguage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("visualize");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [optimalStepIndex, setOptimalStepIndex] = useState(0);
  const [isMyPlaying, setIsMyPlaying] = useState(false);
  const [isOptimalPlaying, setIsOptimalPlaying] = useState(false);
  const [synchronizePlayback, setSynchronizePlayback] = useState(true);
  const [selectedExampleIndex, setSelectedExampleIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisContextKey, setAnalysisContextKey] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisErrorContextKey, setAnalysisErrorContextKey] = useState<string | null>(null);
  const [optimalRetryError, setOptimalRetryError] = useState<string | null>(null);
  const [overlayCompact, setOverlayCompact] = useState(overlayMode);
  const selectionRequestId = useRef(0);

  const currentContextKey =
    problem
      ? getAnalysisContextKey(problem, snapshot ?? undefined, selectedExampleIndex)
      : null;
  const selectedAnalysis = getAnalysisForContext(
    analysis,
    analysisContextKey,
    currentContextKey
  );
  const selectedAnalysisError =
    analysisErrorContextKey === currentContextKey ? analysisError : null;
  const selectedAlgorithmModel =
    snapshot &&
    algorithmModelCode === snapshot.code &&
    algorithmModelLanguage === snapshot.language
      ? algorithmModel
      : null;
  const visualizationPlan = selectedAnalysis?.visualizationPlan;
  const optimalExecution = selectedAnalysis?.optimalExecution;
  const optimalPlan = optimalExecution?.available
    ? optimalExecution.visualizationPlan
    : undefined;
  const steps = visualizationPlan?.steps ?? [];
  const optimalSteps = optimalPlan?.steps ?? [];
  const currentStep = steps[currentStepIndex];
  const optimalCurrentStep = optimalSteps[optimalStepIndex];
  const currentState = visualizationPlan
    ? resolveVisualizationState(
        visualizationPlan.initialState,
        steps,
        currentStepIndex
      )
    : undefined;
  const optimalCurrentState = optimalPlan
    ? resolveVisualizationState(
        optimalPlan.initialState,
        optimalSteps,
        optimalStepIndex
      )
    : undefined;

  // Synchronized playback advances each trace by one independent step and
  // freezes either trace at its own final state.
  useEffect(() => {
    if (
      !synchronizePlayback ||
      (!isMyPlaying && !isOptimalPlaying) ||
      (steps.length <= 1 && optimalSteps.length <= 1)
    ) return;

    const interval = setInterval(() => {
      const nextMyIndex = Math.min(
        currentStepIndex + 1,
        Math.max(steps.length - 1, 0)
      );
      const nextOptimalIndex = Math.min(
        optimalStepIndex + 1,
        Math.max(optimalSteps.length - 1, 0)
      );
      setCurrentStepIndex(nextMyIndex);
      setOptimalStepIndex(nextOptimalIndex);

      if (
        nextMyIndex >= steps.length - 1 &&
        nextOptimalIndex >= optimalSteps.length - 1
      ) {
        setIsMyPlaying(false);
        setIsOptimalPlaying(false);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [
    synchronizePlayback,
    isMyPlaying,
    isOptimalPlaying,
    currentStepIndex,
    optimalStepIndex,
    steps.length,
    optimalSteps.length,
  ]);

  useEffect(() => {
    if (synchronizePlayback || !isMyPlaying || steps.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentStepIndex((index) => {
        const nextIndex = Math.min(index + 1, steps.length - 1);
        if (nextIndex === steps.length - 1) setIsMyPlaying(false);
        return nextIndex;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [synchronizePlayback, isMyPlaying, currentStepIndex, steps.length]);

  useEffect(() => {
    if (synchronizePlayback || !isOptimalPlaying || optimalSteps.length <= 1) return;
    const interval = setInterval(() => {
      setOptimalStepIndex((index) => {
        const nextIndex = Math.min(index + 1, optimalSteps.length - 1);
        if (nextIndex === optimalSteps.length - 1) setIsOptimalPlaying(false);
        return nextIndex;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [
    synchronizePlayback,
    isOptimalPlaying,
    optimalStepIndex,
    optimalSteps.length,
  ]);

  // Load the latest problem, code, and AI analysis from Chrome storage.
  useEffect(() => {
    chrome.storage.local
      .get([
        "problem",
        "codeSnapshot",
        "algorithmModel",
        "algorithmModelCode",
        "algorithmModelLanguage",
        "algorithmAnalysis",
        "algorithmAnalysisContextKey",
        "algorithmAnalysisError",
        "algorithmAnalysisErrorContextKey",
        "selectedExampleIndex",
      ])
      .then((result) => {
        if (isProblem(result.problem)) {
          setProblem(result.problem);
        }

        if (isCodeSnapshot(result.codeSnapshot)) {
          setSnapshot(result.codeSnapshot);
        }

        if (
          isAlgorithmModel(result.algorithmModel) &&
          typeof result.algorithmModelCode === "string" &&
          typeof result.algorithmModelLanguage === "string"
        ) {
          setAlgorithmModel(result.algorithmModel);
          setAlgorithmModelCode(result.algorithmModelCode);
          setAlgorithmModelLanguage(result.algorithmModelLanguage);
        }

        if (isAlgorithmAnalysis(result.algorithmAnalysis)) {
          setAnalysis(result.algorithmAnalysis);
        }

        if (typeof result.algorithmAnalysisContextKey === "string") {
          setAnalysisContextKey(result.algorithmAnalysisContextKey);
        }

        if (typeof result.algorithmAnalysisError === "string") {
          setAnalysisError(result.algorithmAnalysisError);
        }

        if (typeof result.algorithmAnalysisErrorContextKey === "string") {
          setAnalysisErrorContextKey(result.algorithmAnalysisErrorContextKey);
        }

        if (typeof result.selectedExampleIndex === "number") {
          setSelectedExampleIndex(result.selectedExampleIndex);
        }
      })
      .catch((error) => {
        console.error("Failed to load AlgoLens data:", error);
      });

    // Listen for code, problem, and analysis updates from background worker.
    const handleStorageChange = (
      changes: {
        [key: string]: chrome.storage.StorageChange;
      },
      areaName: string
    ) => {
      if (areaName !== "local") {
        return;
      }

      if (changes.problem) {
        const newProblem = changes.problem.newValue;
        if (isProblem(newProblem)) {
          setProblem(newProblem);
          setOptimalRetryError(null);
          setSelectedExampleIndex(0);
          setCurrentStepIndex(0);
          setOptimalStepIndex(0);
          setIsMyPlaying(false);
          setIsOptimalPlaying(false);
          setIsAnalyzing(true);
        } else {
          setProblem(null);
          setIsAnalyzing(false);
        }
      }

      if (changes.codeSnapshot) {
        const newSnapshot = changes.codeSnapshot.newValue;
        if (isCodeSnapshot(newSnapshot)) {
          setSnapshot(newSnapshot);
          setOptimalRetryError(null);
          setCurrentStepIndex(0);
          setOptimalStepIndex(0);
          setIsMyPlaying(false);
          setIsOptimalPlaying(false);
          setIsAnalyzing(true);
        }
      }

      if (changes.algorithmModel) {
        const newModel = changes.algorithmModel.newValue;
        setAlgorithmModel(isAlgorithmModel(newModel) ? newModel : null);
      }

      if (changes.algorithmModelCode) {
        const newModelCode = changes.algorithmModelCode.newValue;
        setAlgorithmModelCode(
          typeof newModelCode === "string" ? newModelCode : null
        );
      }

      if (changes.algorithmModelLanguage) {
        const newModelLanguage = changes.algorithmModelLanguage.newValue;
        setAlgorithmModelLanguage(
          typeof newModelLanguage === "string" ? newModelLanguage : null
        );
      }

      if (changes.selectedExampleIndex) {
        const newExIndex = changes.selectedExampleIndex.newValue;
        if (typeof newExIndex === "number") {
          setSelectedExampleIndex(newExIndex);
          setOptimalRetryError(null);
          setCurrentStepIndex(0);
          setOptimalStepIndex(0);
          setIsMyPlaying(false);
          setIsOptimalPlaying(false);
          setIsAnalyzing(true);
        }
      }

      if (changes.algorithmAnalysis) {
        const newAnalysis = changes.algorithmAnalysis.newValue;

        if (isAlgorithmAnalysis(newAnalysis)) {
          setAnalysis(newAnalysis);
          setCurrentStepIndex(0);
          setOptimalStepIndex(0);
          setIsMyPlaying(false);
          setIsOptimalPlaying(false);
          setIsAnalyzing(false);
        } else {
          setAnalysis(null);
          setCurrentStepIndex(0);
          setOptimalStepIndex(0);
          setIsMyPlaying(false);
          setIsOptimalPlaying(false);
          setIsAnalyzing(false);
        }
      }

      if (changes.algorithmAnalysisContextKey) {
        const newContextKey = changes.algorithmAnalysisContextKey.newValue;
        setAnalysisContextKey(
          typeof newContextKey === "string" ? newContextKey : null
        );
      }

      if (changes.algorithmAnalysisError) {
        const newError = changes.algorithmAnalysisError.newValue;
        setAnalysisError(typeof newError === "string" ? newError : null);
        if (typeof newError === "string") setIsAnalyzing(false);
      }

      if (changes.algorithmAnalysisErrorContextKey) {
        const newErrorContextKey = changes.algorithmAnalysisErrorContextKey.newValue;
        setAnalysisErrorContextKey(
          typeof newErrorContextKey === "string" ? newErrorContextKey : null
        );
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!overlayMode) return;

    const handleOverlayMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      if (event.data?.source !== "algolens-overlay-host") return;
      if (event.data.type === "COMPACT") setOverlayCompact(true);
      if (event.data.type === "EXPANDED" || event.data.type === "RESTORE") {
        setOverlayCompact(false);
      }
    };

    window.addEventListener("message", handleOverlayMessage);
    return () => window.removeEventListener("message", handleOverlayMessage);
  }, [overlayMode]);

  const sendOverlayAction = (
    action: "MINIMIZE" | "EXPAND" | "MAXIMIZE" | "DOCK" | "CLOSE"
  ) => {
    if (!overlayMode) return;
    window.parent.postMessage(
      { source: "algolens-overlay-ui", type: action },
      "*"
    );
    if (action === "MINIMIZE") setOverlayCompact(true);
    if (action === "EXPAND" || action === "MAXIMIZE") setOverlayCompact(false);
  };

  // Handle switching problem examples
  const handleSelectExample = (newIndex: number) => {
    const requestId = ++selectionRequestId.current;
    setOptimalRetryError(null);
    setSelectedExampleIndex(newIndex);
    setCurrentStepIndex(0);
    setOptimalStepIndex(0);
    setIsMyPlaying(false);
    setIsOptimalPlaying(false);
    setIsAnalyzing(true);

    chrome.runtime.sendMessage(
      {
        source: "algolens",
        version: 1,
        type: "SELECT_EXAMPLE",
        timestamp: Date.now(),
        payload: { index: newIndex },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to select example:",
            chrome.runtime.lastError.message
          );
        } else if (!response?.success) {
          console.error(
            "Failed to select example:",
            response?.error ?? "Background selection failed."
          );
        }
        if (requestId === selectionRequestId.current) {
          setIsAnalyzing(false);
          if (!chrome.runtime.lastError && !response?.success) {
            const selectedContextKey =
              problem
                ? getAnalysisContextKey(problem, snapshot ?? undefined, newIndex)
                : null;
            setAnalysisError(
              response?.error ?? "Analysis failed for the selected example."
            );
            setAnalysisErrorContextKey(selectedContextKey);
          }
        }
      }
    );
  };

  const handleRetryOptimal = () => {
    const requestId = ++selectionRequestId.current;
    setOptimalRetryError(null);
    setOptimalStepIndex(0);
    setIsAnalyzing(true);

    chrome.runtime.sendMessage(
      {
        source: "algolens",
        version: 1,
        type: "RETRY_OPTIMAL",
        timestamp: Date.now(),
        payload: {},
      },
      (response) => {
        if (requestId !== selectionRequestId.current) return;
        const runtimeError = chrome.runtime.lastError?.message;
        if (runtimeError || !response?.success) {
          setOptimalRetryError(
            runtimeError ?? response?.error ?? "Optimal analysis retry failed."
          );
          setIsAnalyzing(false);
          return;
        }
        setOptimalRetryError(null);
        setIsAnalyzing(false);
      }
    );
  };

  const stopPlayback = () => {
    setIsMyPlaying(false);
    setIsOptimalPlaying(false);
  };

  const goToPreviousMyStep = () => {
    stopPlayback();
    setCurrentStepIndex((index) => Math.max(0, index - 1));
    if (synchronizePlayback) {
      setOptimalStepIndex((index) => Math.max(0, index - 1));
    }
  };

  const goToNextMyStep = () => {
    stopPlayback();
    setCurrentStepIndex((index) => Math.min(Math.max(steps.length - 1, 0), index + 1));
    if (synchronizePlayback) {
      setOptimalStepIndex((index) =>
        Math.min(Math.max(optimalSteps.length - 1, 0), index + 1)
      );
    }
  };

  const goToPreviousOptimalStep = () => {
    stopPlayback();
    setOptimalStepIndex((index) => Math.max(0, index - 1));
    if (synchronizePlayback) {
      setCurrentStepIndex((index) => Math.max(0, index - 1));
    }
  };

  const goToNextOptimalStep = () => {
    stopPlayback();
    setOptimalStepIndex((index) =>
      Math.min(Math.max(optimalSteps.length - 1, 0), index + 1)
    );
    if (synchronizePlayback) {
      setCurrentStepIndex((index) => Math.min(Math.max(steps.length - 1, 0), index + 1));
    }
  };

  const resetMyVisualization = () => {
    stopPlayback();
    setCurrentStepIndex(0);
    if (synchronizePlayback) setOptimalStepIndex(0);
  };

  const resetOptimalVisualization = () => {
    stopPlayback();
    setOptimalStepIndex(0);
    if (synchronizePlayback) setCurrentStepIndex(0);
  };

  const toggleMyPlay = () => {
    if (synchronizePlayback) {
      if (isMyPlaying || isOptimalPlaying) {
        stopPlayback();
        return;
      }
      if (
        currentStepIndex >= steps.length - 1 &&
        optimalStepIndex >= optimalSteps.length - 1
      ) {
        setCurrentStepIndex(0);
        setOptimalStepIndex(0);
      }
      setIsMyPlaying(steps.length > 1);
      setIsOptimalPlaying(optimalSteps.length > 1);
      return;
    }
    if (steps.length <= 1) return;
    if (!isMyPlaying && currentStepIndex >= steps.length - 1) {
      setCurrentStepIndex(0);
    }
    setIsMyPlaying((playing) => !playing);
  };

  const toggleOptimalPlay = () => {
    if (synchronizePlayback) {
      toggleMyPlay();
      return;
    }
    if (optimalSteps.length <= 1) return;
    if (!isOptimalPlaying && optimalStepIndex >= optimalSteps.length - 1) {
      setOptimalStepIndex(0);
    }
    setIsOptimalPlaying((playing) => !playing);
  };

  const seekMyToStep = (index: number) => {
    stopPlayback();
    if (index < 0 || index >= steps.length) return;
    setCurrentStepIndex(index);
    if (synchronizePlayback && steps.length > 1 && optimalSteps.length > 0) {
      setOptimalStepIndex(
        Math.round((index / (steps.length - 1)) * (optimalSteps.length - 1))
      );
    }
  };

  const seekOptimalToStep = (index: number) => {
    stopPlayback();
    if (index < 0 || index >= optimalSteps.length) return;
    setOptimalStepIndex(index);
    if (synchronizePlayback && optimalSteps.length > 1 && steps.length > 0) {
      setCurrentStepIndex(
        Math.round((index / (optimalSteps.length - 1)) * (steps.length - 1))
      );
    }
  };

  // Derive connection/analysis status
  const currentStatus = isAnalyzing
    ? "analyzing"
    : selectedAnalysisError
    ? "error"
    : selectedAnalysis
    ? "analyzed"
    : snapshot || problem
    ? "ready"
    : "idle";

  const hasAnyData = Boolean(problem || snapshot || selectedAnalysis);

  return (
    <div
      className={`algolens-container${overlayMode ? " lc-overlay-container" : ""}${overlayCompact ? " lc-overlay-compact" : ""}`}
    >
      {/* Header */}
      <Header
        problem={problem}
        status={currentStatus}
        algorithmName={selectedAnalysis?.algorithm}
        overlayControls={overlayMode}
        overlayCompact={overlayCompact}
        onOverlayAction={sendOverlayAction}
      />

      {overlayMode && overlayCompact ? (
        <div className="lc-compact-summary">
          <span>
            {isAnalyzing
              ? "Preparing selected example…"
              : currentStep
              ? currentStep.message
              : "Illustrative execution trace"}
          </span>
          <span className="lc-mono" style={{ whiteSpace: "nowrap" }}>
            {steps.length > 0 ? `My ${currentStepIndex + 1}/${steps.length}` : "My —"}
            {" · "}
            {optimalSteps.length > 0
              ? `Optimal ${optimalStepIndex + 1}/${optimalSteps.length}`
              : "Optimal —"}
          </span>
          {(steps.length > 0 || optimalSteps.length > 0) && (
            <div style={{ display: "flex", gap: 4 }}>
              <button className="lc-icon-button" onClick={goToPreviousMyStep} title="Previous step">‹</button>
              <button className="lc-icon-button" onClick={toggleMyPlay} title={isMyPlaying || isOptimalPlaying ? "Pause" : "Play"}>{isMyPlaying || isOptimalPlaying ? "Ⅱ" : "▶"}</button>
              <button className="lc-icon-button" onClick={goToNextMyStep} title="Next step">›</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <TabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            hasSteps={steps.length > 0}
          />

          <main
            className={overlayMode ? "lc-overlay-main" : undefined}
            style={{
              flex: 1,
              padding: "12px 14px 24px 14px",
              overflowY: "auto",
            }}
          >
            {!hasAnyData ? (
              <EmptyState />
            ) : (
              <>
            {activeTab === "visualize" && (
              <VisualizeTab
                visualizationPlan={visualizationPlan}
                algorithm={selectedAnalysis?.algorithm}
                language={selectedAnalysis?.language}
                explanation={selectedAnalysis?.explanation}
                complexity={selectedAnalysis?.complexity}
                steps={steps}
                optimalSteps={optimalSteps}
                currentStepIndex={currentStepIndex}
                currentStep={currentStep}
                currentState={currentState}
                myExecutionAvailable={selectedAnalysis?.myExecutionAvailable !== false}
                myExecutionUnavailableReason={selectedAnalysis?.myExecutionUnavailableReason}
                analysisError={selectedAnalysisError ?? undefined}
                optimalExecutionError={optimalRetryError ?? undefined}
                optimalExecution={optimalExecution}
                optimalPlan={optimalPlan}
                optimalCurrentStep={optimalCurrentStep}
                optimalCurrentState={optimalCurrentState}
                optimalStepIndex={optimalStepIndex}
                isPlaying={isMyPlaying}
                isOptimalPlaying={isOptimalPlaying}
                synchronizePlayback={synchronizePlayback}
                onSynchronizePlaybackChange={(enabled) => {
                  setSynchronizePlayback(enabled);
                  stopPlayback();
                }}
                examples={problem?.examples}
                selectedExampleIndex={selectedExampleIndex}
                onSelectExample={handleSelectExample}
                isAnalyzing={isAnalyzing}
                onPrevious={goToPreviousMyStep}
                onNext={goToNextMyStep}
                onTogglePlay={toggleMyPlay}
                onReset={resetMyVisualization}
                onSeek={seekMyToStep}
                onOptimalPrevious={goToPreviousOptimalStep}
                onOptimalNext={goToNextOptimalStep}
                onOptimalTogglePlay={toggleOptimalPlay}
                onOptimalReset={resetOptimalVisualization}
                onOptimalSeek={seekOptimalToStep}
                onRetryOptimal={handleRetryOptimal}
              />
            )}

            {activeTab === "step_trace" && (
              <StepTraceTab
                steps={steps}
                currentStepIndex={currentStepIndex}
                onSeek={seekMyToStep}
              />
            )}

            {activeTab === "examples" && (
              <ExamplesTab
                examples={problem?.examples ?? []}
                selectedIndex={selectedExampleIndex}
                onSelectExample={handleSelectExample}
              />
            )}

            {activeTab === "analysis" && (
              <>
                {selectedAnalysis ? (
                  <AnalysisTab analysis={selectedAnalysis} />
                ) : (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "var(--lc-text-secondary)",
                      backgroundColor: "var(--lc-bg-secondary)",
                      borderRadius: 8,
                      border: "1px dashed var(--lc-border)",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 600,
                        color: "var(--lc-text-primary)",
                        marginBottom: 4,
                      }}
                    >
                      Awaiting AI Analysis
                    </p>
                    <p style={{ fontSize: 12 }}>
                      The algorithm explanation and technique breakdown will display once the backend finishes analyzing your code.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "complexity" && (
              <>
                {selectedAnalysis ? (
                  <ComplexityTab analysis={selectedAnalysis} />
                ) : (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      color: "var(--lc-text-secondary)",
                      backgroundColor: "var(--lc-bg-secondary)",
                      borderRadius: 8,
                      border: "1px dashed var(--lc-border)",
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 600,
                        color: "var(--lc-text-primary)",
                        marginBottom: 4,
                      }}
                    >
                      Complexity Awaiting Analysis
                    </p>
                    <p style={{ fontSize: 12 }}>
                      Time and Space asymptotic complexities will appear once the solution is analyzed.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeTab === "code_insights" && (
              <CodeInsightsTab
                snapshot={snapshot}
                analysis={selectedAnalysis}
                model={selectedAlgorithmModel}
              />
            )}
              </>
            )}
          </main>
        </>
      )}
    </div>
  );
}
