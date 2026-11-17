import type {
  VisualizationState,
  ArrayVisualState,
  GraphVisualState,
} from "../../../ai/types";

export interface NormalizedGridData {
  name: string;
  rows: unknown[][];
  activeRow?: number;
  activeCol?: number;
  visitedRows?: boolean[][];
  isLandWaterGrid?: boolean;
}

export interface PointerInfo {
  name: string;
  index: number;
  color: string;
}

/**
 * Checks whether an array's values represent a 2D matrix/grid (array of arrays).
 */
export function isGridRows(values: unknown[]): values is unknown[][] {
  return (
    values.length > 0 &&
    values.every((row) => Array.isArray(row) && row.length > 0)
  );
}

/**
 * Parses coordinate string like "(0, 1)", "0-1", "0,1", "0_1", "r0c1", "cell_0_1"
 */
function parseCoordinate(str: string): { r: number; c: number } | null {
  const clean = str.trim();
  
  // Format: (0, 1) or (0,1)
  const parenMatch = clean.match(/^\(?\s*(\d+)\s*[,_\-\s]\s*(\d+)\s*\)?$/);
  if (parenMatch) {
    return { r: parseInt(parenMatch[1], 10), c: parseInt(parenMatch[2], 10) };
  }

  // Format: r0c1 or cell_0_1
  const rcMatch = clean.match(/r(\d+)c(\d+)|cell[_-](\d+)[_-](\d+)/i);
  if (rcMatch) {
    const r = parseInt(rcMatch[1] ?? rcMatch[3], 10);
    const c = parseInt(rcMatch[2] ?? rcMatch[4], 10);
    return { r, c };
  }

  return null;
}

/**
 * Reads variable values from state.
 */
export function getVariableNumber(
  state: VisualizationState,
  name: string
): number | undefined {
  const variable = state.variables?.find(
    (item) => item.name.toLowerCase() === name.toLowerCase()
  );

  if (typeof variable?.value === "number") {
    return variable.value;
  }

  if (
    typeof variable?.value === "string" &&
    variable.value.trim() !== "" &&
    Number.isFinite(Number(variable.value))
  ) {
    return Number(variable.value);
  }

  return undefined;
}

/**
 * Detects whether a graph is actually a flattened representation of a 2D grid.
 */
function isGridGraph(graph: GraphVisualState, visualizationType?: string): boolean {
  const name = graph.name.toLowerCase();
  if (
    name.includes("grid") ||
    name.includes("matrix") ||
    name.includes("board") ||
    name.includes("island")
  ) {
    return true;
  }

  if (
    visualizationType === "grid" ||
    visualizationType === "grid_traversal" ||
    visualizationType === "matrix"
  ) {
    return true;
  }

  // Check if nodes have coordinate IDs or labels
  if (graph.nodes.length >= 2) {
    const coordinateNodes = graph.nodes.filter(
      (n) => parseCoordinate(n.id) !== null || parseCoordinate(n.label) !== null
    );
    if (coordinateNodes.length >= graph.nodes.length * 0.7) {
      return true;
    }
  }

  return false;
}

/**
 * Converts a grid-representing graph into structured 2D grid data.
 */
function convertGridGraphToGridData(
  graph: GraphVisualState,
  state: VisualizationState
): NormalizedGridData | null {
  const coords: { r: number; c: number; label: string; active?: boolean; visited?: boolean }[] = [];

  for (const node of graph.nodes) {
    const coord = parseCoordinate(node.id) || parseCoordinate(node.label);
    if (coord) {
      coords.push({
        ...coord,
        label: node.label.replace(/^\(?\d+[,_\-\s]\d+\)?\s*[:=]?\s*/, "") || node.label,
        active: node.active,
        visited: node.visited,
      });
    }
  }

  if (coords.length === 0) return null;

  const maxRow = Math.max(...coords.map((c) => c.r));
  const maxCol = Math.max(...coords.map((c) => c.c));

  if (maxRow < 0 || maxCol < 0 || maxRow > 50 || maxCol > 50) {
    return null; // sanity check against invalid dimensions
  }

  const rows: unknown[][] = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => "0")
  );
  const visitedRows: boolean[][] = Array.from({ length: maxRow + 1 }, () =>
    Array.from({ length: maxCol + 1 }, () => false)
  );

  let activeRow = getVariableNumber(state, "r") ?? getVariableNumber(state, "row");
  let activeCol = getVariableNumber(state, "c") ?? getVariableNumber(state, "col");

  for (const item of coords) {
    rows[item.r][item.c] = item.label || "1";
    if (item.visited) {
      visitedRows[item.r][item.c] = true;
    }
    if (item.active && activeRow === undefined) {
      activeRow = item.r;
      activeCol = item.c;
    }
  }

  return {
    name: graph.name || "Grid",
    rows,
    activeRow,
    activeCol,
    visitedRows,
    isLandWaterGrid: true,
  };
}

/**
 * Extracts pointer variables for array visualizations (e.g. left, right, mid).
 */
export function extractArrayPointers(state: VisualizationState): PointerInfo[] {
  if (!state.variables || state.variables.length === 0) return [];

  const pointerNames = [
    { key: "left", label: "L", color: "#38bdf8" },
    { key: "right", label: "R", color: "#f59e0b" },
    { key: "l", label: "L", color: "#38bdf8" },
    { key: "r", label: "R", color: "#f59e0b" },
    { key: "mid", label: "MID", color: "#a855f7" },
    { key: "m", label: "MID", color: "#a855f7" },
    { key: "start", label: "START", color: "#38bdf8" },
    { key: "end", label: "END", color: "#f59e0b" },
    { key: "low", label: "LOW", color: "#38bdf8" },
    { key: "high", label: "HIGH", color: "#f59e0b" },
    { key: "i", label: "i", color: "#34d399" },
    { key: "j", label: "j", color: "#fb7185" },
    { key: "k", label: "k", color: "#fbbf24" },
    { key: "slow", label: "SLOW", color: "#38bdf8" },
    { key: "fast", label: "FAST", color: "#f59e0b" },
    { key: "head", label: "HEAD", color: "#34d399" },
    { key: "curr", label: "CURR", color: "#a855f7" },
  ];

  const pointers: PointerInfo[] = [];

  for (const p of pointerNames) {
    const val = getVariableNumber(state, p.key);
    if (val !== undefined && val >= 0) {
      // Avoid duplicate pointers with identical key and value
      if (!pointers.some((item) => item.name === p.label && item.index === val)) {
        pointers.push({
          name: p.label,
          index: val,
          color: p.color,
        });
      }
    }
  }

  return pointers;
}

export interface NormalizedStateResult {
  grids: NormalizedGridData[];
  arrays: ArrayVisualState[];
  maps: NonNullable<VisualizationState["maps"]>;
  sets: NonNullable<VisualizationState["sets"]>;
  graphs: GraphVisualState[];
  linearStructures: NonNullable<VisualizationState["linearStructures"]>;
  recursionStacks: NonNullable<VisualizationState["recursionStacks"]>;
  trees: NonNullable<VisualizationState["trees"]>;
  tables: NonNullable<VisualizationState["tables"]>;
  variables: NonNullable<VisualizationState["variables"]>;
  pointers: PointerInfo[];
}

/**
 * Normalizes any VisualizationState into cleanly separated, typed visual entities.
 * Resolves flattened gridGraphs into true 2D grids and attaches pointers.
 */
export function normalizeVisualizationState(
  state: VisualizationState,
  visualizationType?: string
): NormalizedStateResult {
  const grids: NormalizedGridData[] = [];
  const remainingArrays: ArrayVisualState[] = [];
  const remainingGraphs: GraphVisualState[] = [];

  const activeRow = getVariableNumber(state, "r") ?? getVariableNumber(state, "row");
  const activeCol = getVariableNumber(state, "c") ?? getVariableNumber(state, "col");

  // 1. Check state.arrays for 2D grids (like grid, visited, matrix, board)
  const gridArray = state.arrays?.find(
    (a) =>
      ["grid", "matrix", "board", "maze"].includes(a.name.toLowerCase()) &&
      isGridRows(a.values)
  );

  const visitedArray = state.arrays?.find(
    (a) =>
      a.name.toLowerCase().includes("visited") &&
      isGridRows(a.values)
  );

  if (gridArray && isGridRows(gridArray.values)) {
    const rows = gridArray.values as unknown[][];
    const visitedRows = visitedArray && isGridRows(visitedArray.values)
      ? (visitedArray.values as unknown[][]).map((row) =>
          row.map((cell) => cell === true || cell === 1 || cell === "true" || cell === "1")
        )
      : undefined;

    grids.push({
      name: gridArray.name,
      rows,
      activeRow,
      activeCol,
      visitedRows,
      isLandWaterGrid: rows.some((row) =>
        row.some((cell) => cell === "1" || cell === 1 || cell === "0" || cell === 0)
      ),
    });
  }

  // Keep arrays that are not 2D grids (and not visited arrays when grid exists)
  for (const arr of state.arrays ?? []) {
    if (gridArray && (arr === gridArray || arr === visitedArray)) {
      continue;
    }

    if (isGridRows(arr.values) && !gridArray) {
      // Unnamed 2D grid
      grids.push({
        name: arr.name,
        rows: arr.values as unknown[][],
        activeRow,
        activeCol,
      });
      continue;
    }

    remainingArrays.push(arr);
  }

  // 2. Check state.graphs for flattened gridGraphs
  for (const graph of state.graphs ?? []) {
    if (grids.length === 0 && isGridGraph(graph, visualizationType)) {
      const converted = convertGridGraphToGridData(graph, state);
      if (converted) {
        grids.push(converted);
        continue; // Suppress from remainingGraphs!
      }
    }
    remainingGraphs.push(graph);
  }

  // 3. Extract pointer markers for arrays
  const pointers = extractArrayPointers(state);

  return {
    grids,
    arrays: remainingArrays,
    maps: state.maps ?? [],
    sets: state.sets ?? [],
    graphs: remainingGraphs,
    linearStructures: state.linearStructures ?? [],
    recursionStacks: state.recursionStacks ?? [],
    trees: state.trees ?? [],
    tables: state.tables ?? [],
    variables: state.variables ?? [],
    pointers,
  };
}
