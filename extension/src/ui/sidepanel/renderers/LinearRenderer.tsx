import type { FC } from "react";
import type { LinearStructureState } from "../../../ai/types";

interface LinearRendererProps {
  structure: LinearStructureState;
}

function displayValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export const LinearRenderer: FC<LinearRendererProps> = ({ structure }) => {
  const { name, kind, items, activeIndex } = structure;
  const isStack = kind === "stack";
  const isQueue = kind === "queue";

  if (isStack) {
    // Stack: render vertical beaker
    // In stack representation, items[0] is bottom and items[items.length - 1] is top (or vice versa).
    // Let's display top element at top.
    const reversedItems = [...items].reverse();

    return (
      <section className="lc-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>🥞</span>
            <span className="lc-section-title" style={{ marginBottom: 0 }}>
              Stack: {name}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--lc-text-muted)" }}>
            Size: {items.length} (LIFO)
          </span>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "var(--lc-text-muted)",
              fontSize: 12,
              border: "1px dashed var(--lc-border)",
              borderRadius: 6,
            }}
          >
            Empty stack
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              margin: "6px auto",
              maxWidth: 240,
            }}
          >
            {/* Stack vessel */}
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: 5,
                padding: "8px 12px 10px 12px",
                borderLeft: "3px solid #64748b",
                borderRight: "3px solid #64748b",
                borderBottom: "4px solid #94a3b8",
                borderRadius: "0 0 8px 8px",
                backgroundColor: "#0f172a",
              }}
            >
              {reversedItems.map((val, revIdx) => {
                const originalIdx = items.length - 1 - revIdx;
                const isTop = revIdx === 0;
                const isActive = activeIndex === originalIdx;

                return (
                  <div
                    key={`stack-item-${originalIdx}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 12px",
                      borderRadius: 6,
                      backgroundColor: isActive
                        ? "#78350f"
                        : isTop
                        ? "#1e293b"
                        : "#1f2937",
                      border: isActive
                        ? "2px solid #f59e0b"
                        : isTop
                        ? "1px solid #38bdf8"
                        : "1px solid #374151",
                      color: "#f8fafc",
                      fontSize: 12,
                      fontWeight: 600,
                      boxShadow: isActive ? "0 0 10px rgba(245, 158, 11, 0.4)" : "none",
                    }}
                  >
                    <span>{displayValue(val)}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {isTop && (
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 3,
                            backgroundColor: "rgba(56, 189, 248, 0.2)",
                            color: "var(--lc-blue)",
                          }}
                        >
                          TOP
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: "#64748b" }}>
                        [{originalIdx}]
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <span
              style={{
                fontSize: 10,
                color: "#64748b",
                marginTop: 4,
                textTransform: "uppercase",
              }}
            >
              Bottom of stack
            </span>
          </div>
        )}
      </section>
    );
  }

  if (isQueue) {
    // Queue: render horizontal line with Front and Rear markers
    return (
      <section className="lc-card" style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>🚶</span>
            <span className="lc-section-title" style={{ marginBottom: 0 }}>
              Queue: {name}
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--lc-text-muted)" }}>
            Size: {items.length} (FIFO)
          </span>
        </div>

        {items.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              color: "var(--lc-text-muted)",
              fontSize: 12,
              border: "1px dashed var(--lc-border)",
              borderRadius: 6,
            }}
          >
            Empty queue
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 10px",
              backgroundColor: "#0f172a",
              borderRadius: 8,
              border: "1px solid #1e293b",
              overflowX: "auto",
            }}
          >
            {/* Front marker */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--lc-easy)",
                  padding: "2px 5px",
                  borderRadius: 3,
                  backgroundColor: "rgba(0, 184, 163, 0.15)",
                }}
              >
                FRONT ➔
              </span>
              <span style={{ fontSize: 9, color: "#64748b" }}>Dequeue</span>
            </div>

            {/* Queue items */}
            {items.map((val, idx) => {
              const isActive = activeIndex === idx;

              return (
                <div
                  key={`queue-item-${idx}`}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 42,
                    minHeight: 42,
                    padding: "4px 8px",
                    borderRadius: 6,
                    backgroundColor: isActive ? "#78350f" : "#1f2937",
                    border: isActive
                      ? "2px solid #f59e0b"
                      : "1px solid #475569",
                    color: "#f8fafc",
                    fontSize: 12,
                    fontWeight: 600,
                    boxShadow: isActive ? "0 0 10px rgba(245, 158, 11, 0.4)" : "none",
                    flexShrink: 0,
                  }}
                >
                  <span>{displayValue(val)}</span>
                  <span style={{ fontSize: 9, color: "#94a3b8" }}>[{idx}]</span>
                </div>
              );
            })}

            {/* Rear marker */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--lc-accent-orange)",
                  padding: "2px 5px",
                  borderRadius: 3,
                  backgroundColor: "rgba(255, 161, 22, 0.15)",
                }}
              >
                ⮜ REAR
              </span>
              <span style={{ fontSize: 9, color: "#64748b" }}>Enqueue</span>
            </div>
          </div>
        )}
      </section>
    );
  }

  // Linked list: node -> node -> null
  return (
    <section className="lc-card" style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span>🔗</span>
          <span className="lc-section-title" style={{ marginBottom: 0 }}>
            Linked List: {name}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "var(--lc-text-muted)" }}>
          {items.length} nodes
        </span>
      </div>

      {items.length === 0 ? (
        <div
          style={{
            padding: 16,
            textAlign: "center",
            color: "var(--lc-text-muted)",
            fontSize: 12,
          }}
        >
          HEAD ➔ null
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "12px 10px",
            backgroundColor: "#0f172a",
            borderRadius: 8,
            border: "1px solid #1e293b",
            overflowX: "auto",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "var(--lc-easy)",
              padding: "2px 5px",
              borderRadius: 3,
              backgroundColor: "rgba(0, 184, 163, 0.15)",
            }}
          >
            HEAD ➔
          </span>

          {items.map((val, idx) => {
            const isActive = activeIndex === idx;

            return (
              <div
                key={`ll-item-${idx}`}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                {/* Node Box */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    borderRadius: 6,
                    border: isActive ? "2px solid #f59e0b" : "1px solid #475569",
                    backgroundColor: isActive ? "#78350f" : "#1f2937",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#f8fafc",
                    }}
                  >
                    {displayValue(val)}
                  </div>
                  <div
                    style={{
                      padding: "6px 6px",
                      backgroundColor: "#334155",
                      borderLeft: "1px solid #475569",
                      fontSize: 10,
                      color: "#94a3b8",
                    }}
                  >
                    next
                  </div>
                </div>

                {/* Arrow Pointer */}
                <span style={{ color: "#38bdf8", fontSize: 14 }}>➔</span>
              </div>
            );
          })}

          {/* Null terminator */}
          <span
            style={{
              fontSize: 11,
              fontFamily: "monospace",
              color: "var(--lc-text-muted)",
              padding: "4px 8px",
              borderRadius: 4,
              backgroundColor: "#1e293b",
            }}
          >
            null
          </span>
        </div>
      )}
    </section>
  );
};
