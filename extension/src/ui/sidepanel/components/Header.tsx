import type { FC } from "react";
import type { Problem, Difficulty } from "../../../shared/types";

interface HeaderProps {
  problem: Problem | null;
  status: "idle" | "ready" | "analyzing" | "analyzed" | "error";
  algorithmName?: string;
  overlayControls?: boolean;
  overlayCompact?: boolean;
  onOverlayAction?: (action: "MINIMIZE" | "EXPAND" | "MAXIMIZE" | "DOCK" | "CLOSE") => void;
}

export const Header: FC<HeaderProps> = ({
  problem,
  status,
  algorithmName,
  overlayControls = false,
  overlayCompact = false,
  onOverlayAction,
}) => {
  const getDifficultyStyle = (difficulty?: Difficulty) => {
    switch (difficulty) {
      case "Easy":
        return {
          color: "var(--lc-easy)",
          backgroundColor: "var(--lc-easy-bg)",
          borderColor: "rgba(0, 184, 163, 0.3)",
        };
      case "Medium":
        return {
          color: "var(--lc-medium)",
          backgroundColor: "var(--lc-medium-bg)",
          borderColor: "rgba(255, 192, 30, 0.3)",
        };
      case "Hard":
        return {
          color: "var(--lc-hard)",
          backgroundColor: "var(--lc-hard-bg)",
          borderColor: "rgba(255, 55, 95, 0.3)",
        };
      default:
        return {
          color: "var(--lc-text-secondary)",
          backgroundColor: "rgba(156, 163, 175, 0.1)",
          borderColor: "var(--lc-border)",
        };
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "analyzing":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--lc-accent-orange)",
              padding: "2px 8px",
              borderRadius: 10,
              backgroundColor: "rgba(255, 161, 22, 0.1)",
              border: "1px solid rgba(255, 161, 22, 0.25)",
            }}
          >
            <span
              className="lc-pulsing"
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--lc-accent-orange)",
              }}
            />
            Analyzing
          </span>
        );
      case "analyzed":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--lc-easy)",
              padding: "2px 8px",
              borderRadius: 10,
              backgroundColor: "var(--lc-easy-bg)",
              border: "1px solid rgba(0, 184, 163, 0.25)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--lc-easy)",
              }}
            />
            Ready
          </span>
        );
      case "ready":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--lc-blue)",
              padding: "2px 8px",
              borderRadius: 10,
              backgroundColor: "var(--lc-blue-bg)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--lc-blue)",
              }}
            />
            Connected
          </span>
        );
      case "error":
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--lc-hard)",
              padding: "2px 8px",
              borderRadius: 10,
              backgroundColor: "var(--lc-hard-bg)",
              border: "1px solid rgba(255, 55, 95, 0.25)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--lc-hard)",
              }}
            />
            Error
          </span>
        );
      default:
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              color: "var(--lc-text-muted)",
              padding: "2px 8px",
              borderRadius: 10,
              backgroundColor: "rgba(107, 114, 128, 0.1)",
              border: "1px solid var(--lc-border)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "var(--lc-text-muted)",
              }}
            />
            Standby
          </span>
        );
    }
  };

  return (
    <header className="lc-header">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              width: 24,
              height: 24,
              flexShrink: 0,
              borderRadius: 7,
              background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 12,
              color: "#fff",
            }}
          >
            ⚡
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span className="lc-header-brand">AlgoLens</span>
              <span className="lc-mono" style={{ color: "var(--lc-text-muted)", fontSize: 9 }}>
                · CODE ANALYSIS
              </span>
            </div>
            <div className="lc-header-problem" title={problem?.title}>
              {problem?.title || "Waiting for a supported problem"}
              {algorithmName ? `  /  ${algorithmName}` : ""}
            </div>
          </div>
        </div>

        <div className="lc-header-actions">
          {problem?.difficulty && (
            <span
              className="lc-mono"
              style={{ fontSize: 9, padding: "3px 6px", borderRadius: 5, border: "1px solid", ...getDifficultyStyle(problem.difficulty) }}
            >
              {problem.difficulty.toUpperCase()}
            </span>
          )}
          {getStatusBadge()}
          {overlayControls && (
            <>
              {!overlayCompact && (
                <button className="lc-icon-button" title="Move to the opposite side" onClick={() => onOverlayAction?.("DOCK")}>⇄</button>
              )}
              <button
                className="lc-icon-button"
                title={overlayCompact ? "Restore AlgoLens" : "Minimize AlgoLens"}
                onClick={() => onOverlayAction?.(overlayCompact ? "EXPAND" : "MINIMIZE")}
              >
                {overlayCompact ? "↗" : "−"}
              </button>
              {!overlayCompact && (
                <button className="lc-icon-button" title="Maximize AlgoLens" onClick={() => onOverlayAction?.("MAXIMIZE")}>□</button>
              )}
              <button className="lc-icon-button" title="Close AlgoLens overlay" onClick={() => onOverlayAction?.("CLOSE")}>×</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
