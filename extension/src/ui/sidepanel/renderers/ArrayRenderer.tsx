import type { FC } from "react";
import type { ArrayVisualState } from "../../../ai/types";
import type { PointerInfo } from "./normalizeVisualizationState";

interface ArrayRendererProps {
  array: ArrayVisualState;
  pointers?: PointerInfo[];
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

export const ArrayRenderer: FC<ArrayRendererProps> = ({ array, pointers = [] }) => {
  const isProcessed = (index: number) =>
    array.processedIndices?.includes(index) ?? false;
  // Combine array-level pointers (if any) with state-level pointers
  const allPointers: PointerInfo[] = [
    ...pointers,
    ...(array.pointers || []).map((p) => ({
      name: p.name,
      index: p.index,
      color: p.color || "#38bdf8",
    })),
  ];

  // Group pointers by index so multiple pointers on the same index (e.g. L, R) stack cleanly
  const pointerMap = new Map<number, PointerInfo[]>();
  for (const p of allPointers) {
    if (p.index >= 0 && p.index < array.values.length) {
      const list = pointerMap.get(p.index) || [];
      list.push(p);
      pointerMap.set(p.index, list);
    }
  }

  return (
    <section className="lc-card" style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span className="lc-section-title" style={{ marginBottom: 0 }}>
          📊 Array: {array.name}
        </span>
        <span style={{ fontSize: 11, color: "var(--lc-text-muted)" }}>
          Length: {array.values.length}
          {array.processedIndices && ` · Processed: ${array.processedIndices.length}`}
        </span>
      </div>

      {/* Array Elements with Pointer Labels */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "flex-end",
          padding: "8px 4px",
          overflowX: "auto",
        }}
      >
        {array.values.map((value, index) => {
          const active = array.activeIndices?.includes(index) ?? false;
          const highlighted = array.highlightedIndices?.includes(index) ?? false;
          const processed = isProcessed(index);
          const cellPointers = pointerMap.get(index) || [];

          return (
            <div
              key={`array-cell-${index}`}
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              {/* Pointer Badges above cell */}
              <div
                style={{
                  minHeight: 18,
                  display: "flex",
                  gap: 3,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cellPointers.map((p, pIdx) => (
                  <span
                    key={`ptr-${p.name}-${pIdx}`}
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: p.color,
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      border: `1px solid ${p.color}`,
                      borderRadius: 3,
                      padding: "0 4px",
                      lineHeight: "14px",
                      fontFamily: "monospace",
                    }}
                  >
                    ▼ {p.name}
                  </span>
                ))}
              </div>

              {/* Element Box */}
              <div
                style={{
                  display: "inline-flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 42,
                  minHeight: 42,
                  padding: "5px 8px",
                  borderRadius: 7,
                  border: active
                    ? "2px solid #f59e0b"
                    : highlighted
                    ? "2px solid #34d399"
                    : processed
                    ? "1px solid #8b5cf6"
                    : cellPointers.length > 0
                    ? `2px solid ${cellPointers[0].color}`
                    : "1px solid #64748b",
                  backgroundColor: active
                    ? "#78350f"
                    : highlighted
                    ? "#064e3b"
                    : processed
                    ? "rgba(139, 92, 246, 0.18)"
                    : "#1f2937",
                  color: "#f9fafb",
                  fontSize: 13,
                  boxShadow: active
                    ? "0 0 10px rgba(245, 158, 11, 0.4)"
                    : highlighted
                    ? "0 0 8px rgba(52, 211, 153, 0.3)"
                    : processed
                    ? "0 0 7px rgba(139, 92, 246, 0.18)"
                    : "none",
                  transition: "all 150ms ease",
                }}
              >
                <span style={{ fontWeight: 600 }}>{displayValue(value)}</span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#9ca3af",
                    fontFamily: "monospace",
                    marginTop: 2,
                  }}
                >
                  [{index}]
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
