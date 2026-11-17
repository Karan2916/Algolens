import type { FC } from "react";
import type { VisualizationState } from "../../ai/types";
import { normalizeVisualizationState, getVariableNumber } from "./renderers/normalizeVisualizationState";
import { GridRenderer } from "./renderers/GridRenderer";
import { TreeRenderer } from "./renderers/TreeRenderer";
import { LinearRenderer } from "./renderers/LinearRenderer";
import { ArrayRenderer } from "./renderers/ArrayRenderer";

interface Props {
  state: VisualizationState;
  visualizationType?: string;
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

export const VisualizationRenderer: FC<Props> = ({ state, visualizationType }) => {
  const normalized = normalizeVisualizationState(state, visualizationType);
  const {
    grids,
    arrays,
    maps,
    graphs,
    linearStructures,
    trees,
    tables,
    variables,
    pointers,
  } = normalized;

  const hasContent =
    grids.length > 0 ||
    arrays.length > 0 ||
    maps.length > 0 ||
    normalized.sets.length > 0 ||
    graphs.length > 0 ||
    linearStructures.length > 0 ||
    normalized.recursionStacks.length > 0 ||
    trees.length > 0 ||
    tables.length > 0 ||
    variables.length > 0;

  if (!hasContent) {
    return (
      <div
        className="lc-card"
        style={{
          textAlign: "center",
          color: "var(--lc-text-secondary)",
          padding: 16,
        }}
      >
        No visualization data is available for this step.
      </div>
    );
  }

  const islandCount =
    getVariableNumber(state, "count") ??
    getVariableNumber(state, "islands") ??
    getVariableNumber(state, "ans");

  const activeViewsList: string[] = [];
  if (grids.length > 0) activeViewsList.push("2D Grid");
  if (trees.length > 0) activeViewsList.push("Tree");
  if (linearStructures.some((s) => s.kind === "stack")) activeViewsList.push("Stack");
  if (linearStructures.some((s) => s.kind === "queue")) activeViewsList.push("Queue");
  if (linearStructures.some((s) => s.kind === "linked_list")) activeViewsList.push("Linked List");
  if (normalized.recursionStacks.length > 0) activeViewsList.push("Recursion Stack");
  if (arrays.length > 0) activeViewsList.push("Array");
  if (maps.length > 0) activeViewsList.push("Hash Map");
  if (normalized.sets.length > 0) activeViewsList.push("Set");
  if (graphs.length > 0) activeViewsList.push("Graph");
  if (tables.length > 0) activeViewsList.push("DP Table");

  const isMultiView = activeViewsList.length > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Synchronized Multi-View Indicator */}
      {isMultiView && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px",
            backgroundColor: "rgba(56, 189, 248, 0.08)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--lc-blue)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>🔗</span>
            <span style={{ fontWeight: 600 }}>Synchronized Multi-View:</span>
            <span>{activeViewsList.join(" + ")}</span>
          </div>
          <span style={{ fontSize: 10, color: "var(--lc-text-muted)" }}>
            Coordinated State
          </span>
        </div>
      )}

      {/* 1. True 2D Grids (including normalized gridGraphs like Number of Islands) */}
      {grids.map((grid, idx) => (
        <GridRenderer
          key={`grid-${grid.name}-${idx}`}
          grid={grid}
          trackedCount={islandCount}
        />
      ))}

      {/* 2. Hierarchical Trees */}
      {trees.map((tree, idx) => (
        <TreeRenderer key={`tree-${tree.name}-${idx}`} tree={tree} />
      ))}

      {/* 3. Stacks, Queues, and Linked Lists */}
      {linearStructures.map((structure, idx) => (
        <LinearRenderer
          key={`linear-${structure.name}-${idx}`}
          structure={structure}
        />
      ))}

      {normalized.recursionStacks.map((stack, stackIndex) => (
        <section key={`recursion-${stack.name}-${stackIndex}`} className="lc-card">
          <span className="lc-section-title">Recursive Calls: {stack.name}</span>
          <div style={{ display: "grid", gap: 6 }}>
            {[...stack.frames].reverse().map((frame) => (
              <div
                key={frame.id}
                style={{
                  padding: "7px 9px",
                  borderRadius: 6,
                  border: frame.active
                    ? "1px solid #a78bfa"
                    : "1px solid #374151",
                  background: frame.active ? "rgba(139,92,246,.16)" : "#1f2937",
                }}
              >
                <strong style={{ color: frame.active ? "#c4b5fd" : "#f9fafb" }}>
                  {frame.label}
                </strong>
                {frame.variables?.map((variable, index) => (
                  <div key={`${variable.name}-${index}`} className="lc-mono" style={{ fontSize: 10 }}>
                    {variable.name} = {displayValue(variable.value)}
                  </div>
                ))}
                {frame.returnValue !== undefined && (
                  <div className="lc-mono" style={{ fontSize: 10 }}>
                    returns {displayValue(frame.returnValue)}
                  </div>
                )}
              </div>
            ))}
            {stack.frames.length === 0 && (
              <span style={{ color: "var(--lc-text-muted)", fontSize: 11 }}>No active calls</span>
            )}
          </div>
        </section>
      ))}

      {/* 4. Arrays (with two_pointers / binary_search / sliding_window pointer tags) */}
      {arrays.map((array, idx) => (
        <ArrayRenderer
          key={`array-${array.name}-${idx}`}
          array={array}
          pointers={pointers}
        />
      ))}

      {/* 5. Hash Maps */}
      {maps.map((map, mapIndex) => (
        <section key={`map-${map.name}-${mapIndex}`} className="lc-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span className="lc-section-title" style={{ marginBottom: 0 }}>
              🗺️ Hash Map: {map.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--lc-text-muted)" }}>
              {Object.keys(map.entries).length} entries
            </span>
          </div>

          {Object.entries(map.entries).length === 0 ? (
            <div style={{ color: "var(--lc-text-muted)", fontSize: 12 }}>
              Empty map
            </div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {Object.entries(map.entries).map(([key, value]) => {
                const highlighted = map.highlightedKeys?.includes(key) ?? false;

                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "6px 10px",
                      borderRadius: 6,
                      backgroundColor: highlighted ? "#064e3b" : "#1f2937",
                      border: highlighted
                        ? "1px solid #34d399"
                        : "1px solid #374151",
                      fontSize: 12,
                    }}
                  >
                    <code
                      style={{
                        color: "var(--lc-accent-orange)",
                        fontWeight: 600,
                      }}
                    >
                      {key}
                    </code>
                    <span style={{ color: "#f9fafb", fontWeight: 500 }}>
                      {displayValue(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {normalized.sets.map((set, setIndex) => (
        <section key={`set-${set.name}-${setIndex}`} className="lc-card">
          <div className="lc-section-title">Set: {set.name}</div>
          {set.items.length === 0 ? (
            <div style={{ color: "var(--lc-text-muted)", fontSize: 12 }}>Empty set</div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {set.items.map((item, index) => {
                const highlighted = set.highlightedItems?.some(
                  (entry) => JSON.stringify(entry) === JSON.stringify(item)
                ) ?? false;
                return (
                  <code
                    key={`${String(item)}-${index}`}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 5,
                      border: highlighted ? "1px solid #34d399" : "1px solid #374151",
                      background: highlighted ? "rgba(52,211,153,.16)" : "#1f2937",
                    }}
                  >
                    {displayValue(item)}
                  </code>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {/* 6. Genuine Node-Edge Graphs */}
      {graphs.map((graph, graphIndex) => (
        <section
          key={`graph-${graph.name}-${graphIndex}`}
          className="lc-card"
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span className="lc-section-title" style={{ marginBottom: 0 }}>
              🕸️ Graph: {graph.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--lc-text-muted)" }}>
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {graph.nodes.map((node) => (
              <div
                key={node.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: node.active
                    ? "2px solid #f59e0b"
                    : node.visited
                    ? "2px solid #34d399"
                    : "1px solid #64748b",
                  backgroundColor: node.active
                    ? "#78350f"
                    : node.visited
                    ? "#064e3b"
                    : "#1f2937",
                  color: "#f9fafb",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span>{node.label}</span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>
                  ({node.id})
                </span>
              </div>
            ))}
          </div>

          {graph.edges.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <span
                style={{
                  color: "var(--lc-text-secondary)",
                  fontWeight: 600,
                  fontSize: 11,
                  display: "block",
                  marginBottom: 4,
                }}
              >
                Edges:
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {graph.edges.map((edge, index) => (
                  <span
                    key={`${edge.from}-${edge.to}-${index}`}
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      backgroundColor: edge.highlighted
                        ? "rgba(52, 211, 153, 0.15)"
                        : "#1f2937",
                      color: edge.highlighted ? "#34d399" : "#cbd5e1",
                      border: "1px solid #374151",
                      fontSize: 11,
                      fontFamily: "monospace",
                    }}
                  >
                    {edge.from} {graph.directed ? "➔" : "—"} {edge.to}
                    {edge.weight !== undefined ? ` (${edge.weight})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      ))}

      {/* 7. Dynamic Programming Tables */}
      {tables.map((table, tableIndex) => (
        <section
          key={`table-${table.name}-${tableIndex}`}
          className="lc-card"
          style={{ overflowX: "auto" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span className="lc-section-title" style={{ marginBottom: 0 }}>
              📋 DP Table: {table.name}
            </span>
          </div>

          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: 12,
              fontFamily: "monospace",
            }}
          >
            <tbody>
              {table.values.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((value, columnIndex) => {
                    const active =
                      table.activeCell?.row === rowIndex &&
                      table.activeCell?.column === columnIndex;

                    return (
                      <td
                        key={columnIndex}
                        style={{
                          padding: "6px 8px",
                          textAlign: "center",
                          border: "1px solid #374151",
                          backgroundColor: active ? "#78350f" : "#1f2937",
                          color: active ? "#fef3c7" : "#f3f4f6",
                          fontWeight: active ? 700 : 500,
                        }}
                      >
                        {displayValue(value)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* 8. Tracked Variables */}
      {variables.length > 0 && (
        <section className="lc-card">
          <span className="lc-section-title">Tracked Variables</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {variables.map((variable, index) => (
              <div
                key={`${variable.name}-${index}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 5,
                  fontSize: 12,
                }}
              >
                <code
                  style={{
                    color: "var(--lc-blue)",
                    fontWeight: 700,
                  }}
                >
                  {variable.name}
                </code>
                {variable.value !== undefined && (
                  <span style={{ color: "#f9fafb", fontWeight: 600 }}>
                    = {displayValue(variable.value)}
                  </span>
                )}
                <span style={{ color: "#9ca3af", fontSize: 10 }}>
                  ({variable.role})
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default VisualizationRenderer;
