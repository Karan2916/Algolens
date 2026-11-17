export type VisualizationType =
  | "array"
  | "array_hashmap"
  | "hashmap"
  | "two_pointers"
  | "sliding_window"
  | "binary_search"
  | "linked_list"
  | "stack"
  | "queue"
  | "graph"
  | "graph_traversal"
  | "grid"
  | "grid_traversal"
  | "matrix"
  | "tree"
  | "tree_traversal"
  | "dynamic_programming"
  | "sorting"
  | "backtracking"
  | "heap"
  | "generic";

export interface DataStructureInfo {
  name: string;
  type: string;
  role: string;
}

export interface TrackedVariable {
  name: string;
  role: string;
  value?: unknown;
}

/**
 * Describes an array or sequence displayed by the visualizer.
 */
export interface ArrayVisualState {
  name: string;
  values: unknown[];
  activeIndices?: number[];
  highlightedIndices?: number[];
  processedIndices?: number[];
  pointers?: {
    name: string;
    index: number;
    color?: string;
  }[];
}

/**
 * Describes key-value entries in a hash map.
 */
export interface MapVisualState {
  name: string;
  entries: Record<string, unknown>;
  highlightedKeys?: string[];
}

export interface SetVisualState {
  name: string;
  items: unknown[];
  highlightedItems?: unknown[];
}

export interface RecursionFrameVisualState {
  id: string;
  label: string;
  variables?: TrackedVariable[];
  active?: boolean;
  returnValue?: unknown;
}

export interface RecursionStackVisualState {
  name: string;
  frames: RecursionFrameVisualState[];
}

/**
 * Describes a graph using nodes and edges.
 */
export interface GraphVisualState {
  name: string;
  directed?: boolean;
  nodes: {
    id: string;
    label: string;
    visited?: boolean;
    active?: boolean;
  }[];
  edges: {
    from: string;
    to: string;
    weight?: number;
    highlighted?: boolean;
  }[];
}

/**
 * Describes a stack, queue, or linked list.
 */
export interface LinearStructureState {
  name: string;
  kind: "stack" | "queue" | "linked_list";
  items: unknown[];
  activeIndex?: number;
}

/**
 * Describes a tree or heap.
 */
export interface TreeVisualState {
  name: string;
  nodes: {
    id: string;
    label: string;
    parentId?: string;
    leftId?: string | null;
    rightId?: string | null;
    active?: boolean;
    visited?: boolean;
  }[];
}

/**
 * Describes a dynamic programming table.
 */
export interface TableVisualState {
  name: string;
  values: unknown[][];
  activeCell?: {
    row: number;
    column: number;
  };
}

/**
 * A generic snapshot of the algorithm's visual state.
 *
 * A category omitted from a playback step is unchanged from the preceding
 * state; an explicit empty array clears it. Tracked variables are step-local.
 */
export interface VisualizationState {
  arrays?: ArrayVisualState[];
  maps?: MapVisualState[];
  sets?: SetVisualState[];
  graphs?: GraphVisualState[];
  linearStructures?: LinearStructureState[];
  recursionStacks?: RecursionStackVisualState[];
  trees?: TreeVisualState[];
  tables?: TableVisualState[];
  variables?: TrackedVariable[];
}

/**
 * One step in an algorithm visualization.
 * Each step describes the state after an operation.
 */
export interface VisualizationStep {
  message: string;
  state: VisualizationState;
  line?: number;
  operation?: string;
}

/**
 * The AI-generated plan and trace consumed by the UI.
 */
export interface VisualizationPlan {
  type: VisualizationType;
  title: string;
  reason: string;
  initialState: VisualizationState;
  steps: VisualizationStep[];
  completion?: {
    status: "completed" | "stopped" | "unknown";
    returnValue?: unknown;
  };
}

export interface OptimalExecution {
  available: boolean;
  unavailableReason?: string;
  language?: string;
  algorithm?: string;
  explanation?: string;
  confidence?: number;
  complexity?: {
    time?: string;
    space?: string;
  };
  visualizationType?: VisualizationType | string;
  visualizationPlan?: VisualizationPlan;
}

/**
 * Analysis returned by the AlgoLens AI backend.
 */
export interface AlgorithmAnalysis {
  algorithm: string;
  language?: string;

  variant?: string;

  confidence: number;

  explanation: string;

  techniques: string[];

  dataStructures: DataStructureInfo[];

  complexity: {
    time?: string;
    space?: string;
  };

  // Visualization selection from the AI.
  visualizationType?: VisualizationType | string;

  visualizationReason?: string;

  variablesToTrack?: TrackedVariable[];

  // Complete visualization plan and execution trace.
  // Optional until the backend generates this structure.
  visualizationPlan?: VisualizationPlan;

  /** Whether the submitted-code trace was understood well enough to display. */
  myExecutionAvailable?: boolean;
  myExecutionUnavailableReason?: string;

  /** Independently generated using only the problem and selected example. */
  optimalExecution?: OptimalExecution;
}