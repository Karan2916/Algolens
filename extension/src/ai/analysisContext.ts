import type { CodeSnapshot, Problem } from "../shared/types";

export function getAnalysisContextKey(
  problem: Problem,
  snapshot: CodeSnapshot | undefined,
  exampleIndex: number
): string {
  const example = problem.examples?.[exampleIndex];

  return JSON.stringify([
    problem.title,
    problem.description,
    snapshot?.language ?? null,
    snapshot?.code ?? null,
    exampleIndex,
    example?.id,
    example?.inputText,
    example?.outputText,
  ]);
}

export function getOptimalContextKey(
  problem: Problem,
  exampleIndex: number
): string {
  const example = problem.examples?.[exampleIndex];
  return JSON.stringify([
    problem.title,
    problem.description,
    problem.difficulty,
    exampleIndex,
    example?.id,
    example?.inputText,
    example?.outputText,
    example?.explanation,
  ]);
}

export function isAnalysisContextCurrent(
  problem: Problem | undefined,
  snapshot: CodeSnapshot | undefined,
  selectedExampleIndex: number | undefined,
  expectedExampleIndex: number,
  expectedContextKey: string
): boolean {
  return (
    selectedExampleIndex === expectedExampleIndex &&
    problem !== undefined &&
    getAnalysisContextKey(problem, snapshot, expectedExampleIndex) ===
      expectedContextKey
  );
}

export function getAnalysisForContext<T>(
  analysis: T | null,
  analysisContextKey: string | null,
  currentContextKey: string | null
): T | null {
  return analysisContextKey && analysisContextKey === currentContextKey
    ? analysis
    : null;
}
