import type { AlgorithmModel } from "../analyzer/types";

export function buildAlgorithmPrompt(
  code: string,
  model: AlgorithmModel
): string {
  return `
You are AlgoLens, an expert algorithm-analysis engine.

Your task is to analyze a user's source code and determine the algorithm,
algorithm variant, techniques, data structures, and complexity.

You will receive TWO sources of information:

1. ORIGINAL SOURCE CODE
2. STRUCTURED CODE MODEL generated using Tree-sitter

Use both.

IMPORTANT:
- Do not rely only on variable names.
- Understand the actual control flow and operations.
- Do not assume that a data structure automatically implies an algorithm.
- Distinguish between similar algorithms when possible.
- If the algorithm cannot be determined confidently, say so.
- Never invent operations that are not present in the code.
- Complexity should be based on the actual implementation.
- Confidence must be between 0 and 1.
- Return ONLY valid JSON.
- Do not use markdown.
- Do not include \`\`\`json.

REQUIRED JSON FORMAT:

{
  "algorithm": "string",
  "variant": "string",
  "confidence": 0.0,
  "explanation": "string",
  "techniques": [
    "string"
  ],
  "dataStructures": [
    {
      "name": "string",
      "type": "string",
      "role": "string"
    }
  ],
  "complexity": {
    "time": "string",
    "space": "string"
  }
}

========================
ORIGINAL SOURCE CODE
========================

${code}

========================
STRUCTURED CODE MODEL
========================

${JSON.stringify(model, null, 2)}

========================
ANALYSIS
========================

Analyze the code now.
`;
}