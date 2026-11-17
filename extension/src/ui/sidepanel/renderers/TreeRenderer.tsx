import type { FC } from "react";
import type { TreeVisualState } from "../../../ai/types";
import { layoutTree } from "./treeLayout";

interface TreeRendererProps {
  tree: TreeVisualState;
}

export const TreeRenderer: FC<TreeRendererProps> = ({ tree }) => {
  const nodes = tree.nodes || [];

  if (nodes.length === 0) {
    return (
      <section className="lc-card">
        <span className="lc-section-title">Tree: {tree.name}</span>
        <p style={{ color: "var(--lc-text-muted)", fontSize: 12 }}>Empty tree</p>
      </section>
    );
  }

  const layout = layoutTree(tree);

  return (
    <section className="lc-card" style={{ overflowX: "auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span className="lc-section-title" style={{ marginBottom: 0 }}>
          🌳 Tree: {tree.name}
        </span>
        <span style={{ fontSize: 11, color: "var(--lc-text-muted)" }}>
          {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
        </span>
      </div>

      {/* Responsive SVG Tree Canvas */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          overflowX: "auto",
          backgroundColor: "#111827",
          borderRadius: 8,
          border: "1px solid #1f2937",
          padding: "6px 0",
        }}
      >
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          style={{
            display: "block",
            overflow: "visible",
            userSelect: "none",
          }}
        >
          <defs>
            {/* Glow filters for active and visited nodes */}
            <filter
              id="tree-active-glow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="4"
                floodColor="#f59e0b"
                floodOpacity="0.8"
              />
            </filter>
            <filter
              id="tree-visited-glow"
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor="#34d399"
                floodOpacity="0.5"
              />
            </filter>
          </defs>

          {/* SVG Smooth Continuous Connector Lines (drawn underneath nodes) */}
          <g className="tree-connectors">
            {layout.edges.map(({ from, to }, idx) => {
              const x1 = from.x;
              const y1 = from.y + from.height / 2;
              const x2 = to.x;
              const y2 = to.y - to.height / 2;
              const midY = (y1 + y2) / 2;

              const isEdgeActive = to.active || from.active;
              const isEdgeVisited = to.visited && from.visited;

              const strokeColor = isEdgeActive
                ? "#f59e0b"
                : isEdgeVisited
                ? "#34d399"
                : "#4b5563";
              const strokeWidth = isEdgeActive ? 2.5 : 1.75;

              return (
                <path
                  key={`edge-${from.id}-${to.id}-${idx}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                />
              );
            })}
          </g>

          {/* Tree Nodes */}
          <g className="tree-nodes">
            {layout.nodes.map((node) => {
              const isActive = node.active ?? false;
              const isVisited = node.visited ?? false;
              const isRoot = node.depth === 0;

              let fill = "#1f2937";
              let stroke = "#4b5563";
              let textColor = "#f9fafb";
              let filter = undefined;

              if (isVisited) {
                fill = "#064e3b";
                stroke = "#34d399";
                textColor = "#a7f3d0";
                filter = "url(#tree-visited-glow)";
              }

              if (isActive) {
                fill = "#78350f";
                stroke = "#f59e0b";
                textColor = "#fef3c7";
                filter = "url(#tree-active-glow)";
              }

              return (
                <g
                  key={`tree-node-${node.id}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  filter={filter}
                  style={{ transition: "all 150ms ease" }}
                >
                  <title>{`Node ID: ${node.id}${node.parentId ? `, Parent: ${node.parentId}` : " (Root)"}`}</title>

                  {/* Node Pill Background */}
                  <rect
                    x={-node.width / 2}
                    y={-node.height / 2}
                    width={node.width}
                    height={node.height}
                    rx={node.height / 2}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />

                  {/* Label Text */}
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill={textColor}
                    fontSize="12"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, sans-serif"
                  >
                    {node.label}
                  </text>

                  {/* Root Tag above node */}
                  {isRoot && (
                    <text
                      textAnchor="middle"
                      y={-node.height / 2 - 4}
                      fill="var(--lc-text-secondary)"
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="system-ui, sans-serif"
                    >
                      ROOT
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 8,
          fontSize: 11,
          color: "var(--lc-text-secondary)",
          justifyContent: "center",
        }}
      >
        <span>🟠 Active</span>
        <span>🟢 Visited</span>
        <span>⚪ Unvisited</span>
      </div>
    </section>
  );
};
