import type { Problem, Difficulty, ProblemExample } from "../shared/types";

function getElement(selectors: string[]): Element | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  return null;
}

function getText(selectors: string[]): string {
  const element = getElement(selectors);
  return element?.textContent?.trim() || "";
}

function getDifficulty(): Difficulty {
  const text = document.body.innerText;
  const match = text.match(/\b(Easy|Medium|Hard)\b/);

  if (match?.[1] === "Easy") return "Easy";
  if (match?.[1] === "Hard") return "Hard";

  return "Medium";
}

function parseExampleText(rawText: string, id: number): ProblemExample | null {
  if (!rawText.includes("Input") && !rawText.includes("input")) {
    return null;
  }

  // Extract Input
  const inputMatch = rawText.match(/Input:\s*([\s\S]*?)(?=(?:\n\s*Output:|\n\s*Explanation:|$))/i);
  // Extract Output
  const outputMatch = rawText.match(/Output:\s*([\s\S]*?)(?=(?:\n\s*Explanation:|$))/i);
  // Extract Explanation
  const explanationMatch = rawText.match(/Explanation:\s*([\s\S]*?)$/i);

  const inputText = inputMatch?.[1]?.trim() || "";
  const outputText = outputMatch?.[1]?.trim() || "";
  const explanation = explanationMatch?.[1]?.trim() || undefined;

  if (!inputText && !outputText) {
    return null;
  }

  return {
    id,
    inputText: inputText || "N/A",
    outputText: outputText || "N/A",
    explanation,
    rawText: rawText.trim(),
  };
}

export function extractExamples(descriptionEl: Element | null, fullText: string): ProblemExample[] {
  const examples: ProblemExample[] = [];

  // Strategy 1: Check DOM for .example-block elements (modern LeetCode)
  if (descriptionEl) {
    const exampleBlocks = descriptionEl.querySelectorAll(".example-block, div[class*='example-block']");
    if (exampleBlocks.length > 0) {
      exampleBlocks.forEach((block, idx) => {
        const text = block.textContent || "";
        const parsed = parseExampleText(text, idx + 1);
        if (parsed) {
          examples.push(parsed);
        }
      });
    }

    // Strategy 2: Check DOM for <pre> tags (classic LeetCode)
    if (examples.length === 0) {
      const preElements = descriptionEl.querySelectorAll("pre");
      preElements.forEach((pre, idx) => {
        const text = pre.textContent || "";
        const parsed = parseExampleText(text, idx + 1);
        if (parsed) {
          examples.push(parsed);
        }
      });
    }
  }

  // Strategy 3: Text regex split on full description (fallback)
  if (examples.length === 0 && fullText) {
    const parts = fullText.split(/Example\s+(\d+)[:\.]?/i);
    // parts[0] is intro, then [id, content, id, content, ...]
    for (let i = 1; i < parts.length; i += 2) {
      const id = parseInt(parts[i], 10) || Math.floor(i / 2) + 1;
      const content = parts[i + 1] || "";
      const parsed = parseExampleText(content, id);
      if (parsed) {
        examples.push(parsed);
      }
    }
  }

  return examples;
}

export function extractProblem(): Problem | null {
  const title = getText([
    '[data-cy="question-title"]',
    '[data-testid="question-title"]',
    'div[class*="text-title-large"]',
    "a[href*='/problems/']",
  ]);

  const descriptionEl = getElement([
    '[data-track-load="description_content"]',
    '[data-testid="description-content"]',
    'div[class*="elfjS"]',
    'div[class*="question-content"]',
  ]);

  const description = descriptionEl?.textContent?.trim() || "";

  if (!title || !description) {
    console.warn("AlgoLens: Problem title or description not found.", {
      titleFound: Boolean(title),
      descriptionFound: Boolean(description),
      url: window.location.href,
    });

    return null;
  }

  const examples = extractExamples(descriptionEl, description);

  return {
    title: title.replace(/^\d+\.\s*/, "").trim(),
    difficulty: getDifficulty(),
    description,
    examples: examples.length > 0 ? examples : undefined,
  };
}
