export type SemanticType =
  | "array"
  | "stack"
  | "queue"
  | "map"
  | "set"
  | "graph"
  | "tree"
  | "unknown";

export type AlgorithmConstructType =
  | "function"
  | "loop"
  | "condition"
  | "recursion"
  | "variable"
  | "operation"
  | "array"
  | "stack"
  | "queue"
  | "graph"
  | "tree"
  | "unknown";

export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface Operation {
  name: string;
  location: SourceLocation;
}

export interface AlgorithmConstruct {
  type: AlgorithmConstructType;

  name?: string;

  dataType?: string;

  semanticType?: SemanticType;

  operations?: Operation[];

  location: SourceLocation;

  children: AlgorithmConstruct[];
}

export interface AlgorithmModel {
  language: string;

  constructs: AlgorithmConstruct[];
}