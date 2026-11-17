import type { AlgorithmModel } from "../analyzer/types";
import type { AlgorithmAnalysis } from "./types";
import { buildAlgorithmPrompt } from "./prompt";

export interface AIProvider {
  analyze(
    prompt: string
  ): Promise<string>;
}

export async function analyzeAlgorithm(
  code: string,
  model: AlgorithmModel,
  provider: AIProvider
): Promise<AlgorithmAnalysis> {

  const prompt =
    buildAlgorithmPrompt(
      code,
      model
    );

  const rawResponse =
    await provider.analyze(prompt);

  try {

    const cleaned =
      rawResponse
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "");

    const parsed =
      JSON.parse(cleaned);

    return parsed as AlgorithmAnalysis;

  } catch (error) {

    console.error(
      "❌ Failed to parse AI response:",
      rawResponse
    );

    throw new Error(
      "AI returned invalid JSON"
    );
  }
}