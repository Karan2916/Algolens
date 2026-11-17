// --------------------
// Difficulty Levels
// --------------------

export type Difficulty = "Easy" | "Medium" | "Hard";

// --------------------
// Supported Languages
// --------------------

export type ProgrammingLanguage =
  | "cpp"
  | "java"
  | "python"
  | "python3"
  | "javascript"
  | "typescript"
  | "c"
  | "csharp"
  | "go"
  | "rust"
  | "kotlin"
  | "swift"
  | "php"
  | "ruby";

// --------------------
// LeetCode Problem & Examples
// --------------------

export interface ProblemExample {
  id: number;
  inputText: string;
  outputText: string;
  explanation?: string;
  rawText?: string;
}

export interface Problem {
  title: string;
  difficulty: Difficulty;
  description: string;
  examples?: ProblemExample[];
}

// --------------------
// User Code
// --------------------

export interface CodeSnapshot {
  code: string;
  language: ProgrammingLanguage;
}

// --------------------
// Complete State
// --------------------

export interface ProblemState {
  problem: Problem;
  code: CodeSnapshot;
}


export interface CursorPosition {
  line: number;
  column: number;
}

export interface CodeSelection {
  start: CursorPosition;
  end: CursorPosition;
}

export interface CodeSnapshot {
  code: string;
  language: ProgrammingLanguage;
  filename?: string;
  cursor?: CursorPosition;
  selection?: CodeSelection;
  timestamp: number;
}