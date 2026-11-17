import type { FC } from "react";

interface PlaybackControlsProps {
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek?: (index: number) => void;
}

export const PlaybackControls: FC<PlaybackControlsProps> = ({
  currentStepIndex,
  totalSteps,
  isPlaying,
  onPrevious,
  onNext,
  onTogglePlay,
  onReset,
  onSeek,
}) => {
  const isFirst = currentStepIndex <= 0;
  const isLast = currentStepIndex >= totalSteps - 1;
  const progressPercent = totalSteps > 1
    ? ((currentStepIndex) / (totalSteps - 1)) * 100
    : 0;

  return (
    <div
      style={{
        padding: "10px 14px",
        backgroundColor: "var(--lc-bg-secondary)",
        border: "1px solid var(--lc-border)",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Progress scrub bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          onClick={(e) => {
            if (!onSeek || totalSteps <= 1) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const ratio = Math.max(0, Math.min(1, clickX / rect.width));
            const newIndex = Math.round(ratio * (totalSteps - 1));
            onSeek(newIndex);
          }}
          style={{
            flex: 1,
            height: 6,
            backgroundColor: "var(--lc-bg-tertiary)",
            borderRadius: 3,
            overflow: "hidden",
            cursor: totalSteps > 1 ? "pointer" : "default",
            position: "relative",
          }}
          title="Click to jump to step"
        >
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              backgroundColor: "var(--lc-accent-orange)",
              borderRadius: 3,
              transition: "width 200ms ease",
            }}
          />
        </div>

        {/* Step indicator */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--lc-text-secondary)",
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {totalSteps > 0
            ? `Step ${currentStepIndex + 1} of ${totalSteps}`
            : "No steps"}
        </span>
      </div>

      {/* Control buttons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
        }}
      >
        <button
          className="lc-button"
          onClick={onReset}
          disabled={isFirst && !isPlaying}
          title="Reset to beginning"
          style={{ padding: "5px 10px", fontSize: 11 }}
        >
          <span>↺</span>
          <span>Reset</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            className="lc-button"
            onClick={onPrevious}
            disabled={isFirst}
            title="Previous step"
            style={{ padding: "5px 10px", fontSize: 11 }}
          >
            <span>⏮</span>
            <span>Prev</span>
          </button>

          <button
            className="lc-button lc-button-primary"
            onClick={onTogglePlay}
            disabled={totalSteps <= 1}
            title={isPlaying ? "Pause playback" : "Play automatically"}
            style={{ minWidth: 78, padding: "5px 12px" }}
          >
            {isPlaying ? (
              <>
                <span>⏸</span>
                <span>Pause</span>
              </>
            ) : (
              <>
                <span>▶</span>
                <span>Play</span>
              </>
            )}
          </button>

          <button
            className="lc-button"
            onClick={onNext}
            disabled={isLast}
            title="Next step"
            style={{ padding: "5px 10px", fontSize: 11 }}
          >
            <span>Next</span>
            <span>⏭</span>
          </button>
        </div>
      </div>
    </div>
  );
};
