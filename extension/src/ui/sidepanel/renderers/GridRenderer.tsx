import type { FC } from "react";
import type { NormalizedGridData } from "./normalizeVisualizationState";

interface GridRendererProps {
  grid: NormalizedGridData;
  trackedCount?: number | string;
}

export const GridRenderer: FC<GridRendererProps> = ({ grid, trackedCount }) => {
  const { rows, activeRow, activeCol, visitedRows, isLandWaterGrid } = grid;
  const numRows = rows.length;
  const numCols = Math.max(...rows.map((row) => row.length));

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>🔲</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--lc-text-primary)",
            }}
          >
            2D Grid: {grid.name}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "var(--lc-text-muted)",
              fontFamily: "monospace",
            }}
          >
            ({numRows} × {numCols})
          </span>
        </div>

        {activeRow !== undefined && activeCol !== undefined && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 4,
              backgroundColor: "rgba(255, 161, 22, 0.15)",
              color: "var(--lc-accent-orange)",
              border: "1px solid rgba(255, 161, 22, 0.3)",
              fontFamily: "monospace",
            }}
          >
            Active: [{activeRow}, {activeCol}]
          </span>
        )}
      </div>

      {/* Grid Canvas with Coordinate Headers */}
      <div
        style={{
          display: "inline-block",
          margin: "8px auto",
          padding: 8,
          borderRadius: 8,
          backgroundColor: "#111827",
          border: "1px solid #1f2937",
        }}
      >
        {/* Column Headers */}
        <div
          style={{
            display: "flex",
            marginLeft: 26,
            marginBottom: 4,
            gap: 4,
          }}
        >
          {Array.from({ length: numCols }, (_, c) => (
            <div
              key={`col-hdr-${c}`}
              style={{
                width: 32,
                textAlign: "center",
                fontSize: 10,
                fontFamily: "monospace",
                color: activeCol === c ? "var(--lc-accent-orange)" : "var(--lc-text-muted)",
                fontWeight: activeCol === c ? 700 : 500,
              }}
            >
              c{c}
            </div>
          ))}
        </div>

        {/* Rows with Row Headers */}
        {rows.map((row, r) => (
          <div
            key={`row-${r}`}
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 4,
              gap: 4,
            }}
          >
            {/* Row Header */}
            <span
              style={{
                width: 22,
                fontSize: 10,
                fontFamily: "monospace",
                textAlign: "right",
                color: activeRow === r ? "var(--lc-accent-orange)" : "var(--lc-text-muted)",
                fontWeight: activeRow === r ? 700 : 500,
                marginRight: 4,
              }}
            >
              r{r}
            </span>

            {/* Cells */}
            {row.map((cell, c) => {
              const strCell = String(cell);
              const isLand = isLandWaterGrid && (strCell === "1" || cell === 1);
              const isWater = isLandWaterGrid && (strCell === "0" || cell === 0);
              const isVisited =
                visitedRows?.[r]?.[c] === true ||
                strCell === "visited" ||
                strCell === "2";
              const isActive = activeRow === r && activeCol === c;

              let bg = "#1f2937";
              let border = "1px solid #374151";
              let text = "#f3f4f6";
              let symbol = strCell;

              if (isLandWaterGrid) {
                if (isLand) {
                  bg = "#166534";
                  border = "1px solid #4ade80";
                  symbol = "●";
                  if (isVisited) {
                    bg = "#6d28d9";
                    border = "1px solid #c4b5fd";
                    symbol = "✦";
                  }
                } else if (isWater) {
                  bg = "#075985";
                  border = "1px solid #38bdf8";
                  symbol = "≈";
                }
              } else {
                if (isVisited) {
                  bg = "#064e3b";
                  border = "1px solid #34d399";
                }
              }

              if (isActive) {
                bg = "#c2410c";
                border = "2px solid #fdba74";
                symbol = isLandWaterGrid ? "✹" : strCell;
              }

              return (
                <div
                  key={`cell-${r}-${c}`}
                  title={`Row ${r}, Col ${c}: ${strCell}${isVisited ? " (visited)" : ""}${isActive ? " (active)" : ""}`}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 6,
                    backgroundColor: bg,
                    border,
                    color: text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    boxShadow: isActive
                      ? "0 0 12px rgba(249, 115, 22, 0.7)"
                      : isVisited
                      ? "0 0 8px rgba(139, 92, 246, 0.3)"
                      : "none",
                    transition: "all 150ms ease",
                    cursor: "default",
                    userSelect: "none",
                  }}
                >
                  {symbol}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend & Stats */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginTop: 8,
          fontSize: 11,
          color: "var(--lc-text-secondary)",
          paddingTop: 8,
          borderTop: "1px solid var(--lc-border)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {isLandWaterGrid ? (
            <>
              <span>🟢 Land (1)</span>
              <span>🟣 Explored (✦)</span>
              <span>🟠 Active (✹)</span>
              <span>🔵 Water (0)</span>
            </>
          ) : (
            <>
              <span>🟠 Active cell</span>
              <span>🟢 Visited cell</span>
            </>
          )}
        </div>

        {trackedCount !== undefined && (
          <span
            style={{
              fontWeight: 600,
              color: "var(--lc-text-primary)",
            }}
          >
            Count: {trackedCount}
          </span>
        )}
      </div>
    </section>
  );
};
