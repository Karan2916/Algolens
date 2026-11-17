import type { FC } from "react";

interface EmptyStateProps {
  message?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  message = "Navigate to any LeetCode problem to visualize its algorithmic execution in real-time.",
}) => (
  <div
    style={{
      padding: "36px 16px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    }}
  >
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        backgroundColor: "var(--lc-bg-secondary)",
        border: "1px solid var(--lc-border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 22,
      }}
    >
      💡
    </div>

    <h3
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: "var(--lc-text-primary)",
      }}
    >
      Ready for LeetCode
    </h3>

    <p
      style={{
        fontSize: 12,
        color: "var(--lc-text-secondary)",
        lineHeight: 1.5,
        maxWidth: 280,
      }}
    >
      {message}
    </p>

    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        borderRadius: 20,
        backgroundColor: "var(--lc-bg-secondary)",
        border: "1px solid var(--lc-border)",
        fontSize: 11,
        color: "var(--lc-text-muted)",
        marginTop: 6,
      }}
    >
      <span style={{ color: "var(--lc-accent-orange)" }}>●</span>
      AI source analysis for supported LeetCode languages · C++ structural parser
    </div>
  </div>
);

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: FC<LoadingStateProps> = ({
  message = "Generating algorithm execution trace...",
}) => (
  <div
    style={{
      padding: "32px 16px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    }}
  >
    <div
      className="lc-pulsing"
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        border: "3px solid var(--lc-border)",
        borderTopColor: "var(--lc-accent-orange)",
        animation: "spin 1s linear infinite",
      }}
    />

    <p
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: "var(--lc-text-primary)",
      }}
    >
      {message}
    </p>

    <p
      style={{
        fontSize: 11,
        color: "var(--lc-text-muted)",
      }}
    >
      Extracting AST nodes & querying AI visualizer...
    </p>
  </div>
);

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div
    style={{
      padding: 16,
      borderRadius: 8,
      backgroundColor: "var(--lc-hard-bg)",
      border: "1px solid rgba(255, 55, 95, 0.3)",
      color: "var(--lc-text-primary)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      margin: "12px 0",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "var(--lc-hard)", fontWeight: 700 }}>⚠️</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--lc-hard)" }}>
        Analysis Error
      </span>
    </div>

    <p style={{ fontSize: 12, color: "var(--lc-text-secondary)" }}>
      {error}
    </p>

    {onRetry && (
      <button
        className="lc-button"
        onClick={onRetry}
        style={{
          alignSelf: "flex-start",
          marginTop: 4,
          borderColor: "rgba(255, 55, 95, 0.4)",
        }}
      >
        Retry Analysis
      </button>
    )}
  </div>
);
