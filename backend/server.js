require("dotenv").config();

const express = require("express");
const OpenAI = require("openai");
const cors = require("cors");
const {
  createOptimalAnalysisCache,
  getOptimalCacheKey,
} = require("./optimalAnalysisCache");
const { matchesExpectedOutput } = require("./traceValidation");
const {
  sanitizeVisualizationPlan,
} = require("./traceState");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({
  baseURL: "https://algolens-foundry.services.ai.azure.com/openai/v1",
  apiKey: process.env.AZURE_AI_API_KEY,
});

const MODEL_NAME = "gpt-4.1-mini";
const PORT = 3001;

const ALLOWED_VISUALIZATION_TYPES = new Set([
  "array",
  "array_hashmap",
  "hashmap",
  "two_pointers",
  "sliding_window",
  "binary_search",
  "linked_list",
  "stack",
  "queue",
  "graph",
  "graph_traversal",
  "grid",
  "grid_traversal",
  "matrix",
  "tree",
  "tree_traversal",
  "dynamic_programming",
  "sorting",
  "backtracking",
  "heap",
  "generic",
]);

app.get("/", (_req, res) => {
  res.send("AlgoLens AI backend is running!");
});

// Test Azure AI connectivity.
app.get("/test-ai", async (_req, res) => {
  try {
    if (!process.env.AZURE_AI_API_KEY) {
      return res.status(503).json({
        error: "AZURE_AI_API_KEY is not configured in backend/.env.",
      });
    }

    const response = await client.responses.create({
      model: MODEL_NAME,
      input:
        "Explain why binary search has O(log n) time complexity in two sentences.",
    });

    res.json({ answer: response.output_text });
  } catch (error) {
    console.error(
      "Azure AI request failed:",
      error.status,
      error.message
    );

    res.status(500).json({
      error: "Azure AI request failed. Check the backend terminal.",
    });
  }
});

// Basic object validation.
function isObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

// Validate the generic visualization state.
function isVisualizationState(state) {
  if (!isObject(state)) return false;

  const arrayFields = [
    "arrays",
    "maps",
    "sets",
    "graphs",
    "linearStructures",
    "recursionStacks",
    "trees",
    "tables",
    "variables",
  ];

  for (const field of arrayFields) {
    if (
      state[field] !== undefined &&
      !Array.isArray(state[field])
    ) {
      return false;
    }
  }

  if (
    state.arrays &&
    !state.arrays.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        Array.isArray(item.values) &&
        ["activeIndices", "highlightedIndices", "processedIndices"].every(
          (field) =>
            item[field] === undefined ||
            (
              Array.isArray(item[field]) &&
              item[field].every(
                (index) =>
                  Number.isInteger(index) &&
                  index >= 0 &&
                  index < item.values.length
              )
            )
        )
    )
  ) {
    return false;
  }

  if (
    state.maps &&
    !state.maps.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        isObject(item.entries)
    )
  ) {
    return false;
  }

  if (
    state.sets &&
    !state.sets.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        Array.isArray(item.items) &&
        (
          item.highlightedItems === undefined ||
          Array.isArray(item.highlightedItems)
        )
    )
  ) {
    return false;
  }

  if (
    state.graphs &&
    !state.graphs.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        Array.isArray(item.nodes) &&
        Array.isArray(item.edges) &&
        item.nodes.every(
          (node) =>
            isObject(node) &&
            typeof node.id === "string" &&
            typeof node.label === "string"
        ) &&
        item.edges.every(
          (edge) =>
            isObject(edge) &&
            typeof edge.from === "string" &&
            typeof edge.to === "string"
        )
    )
  ) {
    return false;
  }

  if (
    state.linearStructures &&
    !state.linearStructures.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        ["stack", "queue", "linked_list"].includes(item.kind) &&
        Array.isArray(item.items)
    )
  ) {
    return false;
  }

  if (
    state.recursionStacks &&
    !state.recursionStacks.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        Array.isArray(item.frames) &&
        item.frames.every(
          (frame) =>
            isObject(frame) &&
            typeof frame.id === "string" &&
            typeof frame.label === "string" &&
            (
              frame.variables === undefined ||
              (
                Array.isArray(frame.variables) &&
                frame.variables.every(
                  (variable) =>
                    isObject(variable) &&
                    typeof variable.name === "string" &&
                    typeof variable.role === "string"
                )
              )
            )
        )
    )
  ) {
    return false;
  }

  if (
    state.trees &&
    !state.trees.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        Array.isArray(item.nodes) &&
        item.nodes.every(
          (node) =>
            isObject(node) &&
            typeof node.id === "string" &&
            typeof node.label === "string" &&
            (
              node.leftId === undefined ||
              node.leftId === null ||
              typeof node.leftId === "string"
            ) &&
            (
              node.rightId === undefined ||
              node.rightId === null ||
              typeof node.rightId === "string"
            )
        ) &&
        item.nodes.every(
          (node) =>
            [node.leftId, node.rightId].every(
              (childId) =>
                childId === undefined ||
                childId === null ||
                item.nodes.some((candidate) => candidate.id === childId)
            )
        )
    )
  ) {
    return false;
  }

  if (
    state.tables &&
    !state.tables.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        Array.isArray(item.values) &&
        item.values.every(Array.isArray)
    )
  ) {
    return false;
  }

  if (
    state.variables &&
    !state.variables.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        typeof item.role === "string"
    )
  ) {
    return false;
  }

  return true;
}

// Validate the generated visualization plan.
function isVisualizationPlan(plan) {
  if (
    !isObject(plan) ||
    typeof plan.type !== "string" ||
    !ALLOWED_VISUALIZATION_TYPES.has(plan.type) ||
    typeof plan.title !== "string" ||
    typeof plan.reason !== "string" ||
    !isVisualizationState(plan.initialState) ||
    !Array.isArray(plan.steps) ||
    plan.steps.length === 0 ||
    (
      plan.completion !== undefined &&
      (
        !isObject(plan.completion) ||
        !["completed", "stopped", "unknown"].includes(plan.completion.status)
      )
    )
  ) {
    return false;
  }

  return plan.steps.every(
    (step) =>
      isObject(step) &&
      typeof step.message === "string" &&
      isVisualizationState(step.state) &&
      (
        step.operation === undefined ||
        typeof step.operation === "string"
      ) &&
      (
        step.line === undefined ||
        (
          typeof step.line === "number" &&
          Number.isFinite(step.line)
        )
      )
  );
}

function parseModelJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error("Azure AI returned an empty response.");
  }

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // First try the complete response. This is the expected format.
  try {
    return JSON.parse(cleaned);
  } catch (_firstError) {
    // Some model responses contain a short sentence before/after the JSON.
    // Extract the first balanced JSON object without breaking braces in strings.
    const start = cleaned.indexOf("{");
    if (start < 0) {
      throw new Error("AI response did not contain a JSON object.");
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i += 1) {
      const char = cleaned[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          const jsonText = cleaned.slice(start, i + 1);
          try {
            return JSON.parse(jsonText);
          } catch (_secondError) {
            throw new Error("AI response contained malformed JSON.");
          }
        }
      }
    }

    throw new Error("AI response contained an incomplete JSON object.");
  }
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asConfidence(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(1, numeric));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item : null))
    .filter((item) => item !== null);
}

function normalizeDataStructures(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        return {
          name: item,
          type: "unknown",
          role: "Identified by AI",
        };
      }
      if (!isObject(item) || typeof item.name !== "string") return null;
      return {
        name: item.name,
        type: asString(item.type, "unknown"),
        role: asString(item.role, "Role not specified"),
      };
    })
    .filter(Boolean);
}

function normalizeVariables(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") {
        return { name: item, role: "Variable identified by AI" };
      }
      if (!isObject(item) || typeof item.name !== "string") return null;
      return {
        name: item.name,
        role: asString(item.role, "Role not specified"),
      };
    })
    .filter(Boolean);
}

// Normalize optional/mis-typed model fields instead of discarding an otherwise
// useful algorithm explanation. Visualization plans remain strictly validated.
function normalizeAnalysis(candidate, language) {
  if (!isObject(candidate)) {
    throw new Error("AI analysis response must be a JSON object.");
  }

  const issues = [];
  const complexity = isObject(candidate.complexity)
    ? candidate.complexity
    : {};

  const algorithm = asString(
    candidate.algorithm,
    asString(candidate.algorithmName, "Unidentified algorithm")
  );
  if (algorithm === "Unidentified algorithm") issues.push("algorithm");

  const variant = asString(
    candidate.variant,
    asString(candidate.pattern, "Not specified")
  );
  if (variant === "Not specified") issues.push("variant");

  const timeComplexity = asString(
    complexity.time,
    asString(candidate.timeComplexity, "Unable to determine reliably")
  );
  const spaceComplexity = asString(
    complexity.space,
    asString(candidate.spaceComplexity, "Unable to determine reliably")
  );
  if (timeComplexity === "Unable to determine reliably") {
    issues.push("complexity.time");
  }
  if (spaceComplexity === "Unable to determine reliably") {
    issues.push("complexity.space");
  }

  const rawPlan = isObject(candidate.visualizationPlan)
    ? candidate.visualizationPlan
    : undefined;
  if (rawPlan) sanitizeVisualizationPlan(rawPlan);
  const hasValidPlanShape = isVisualizationPlan(rawPlan);
  const modelSaysAvailable = candidate.myExecutionAvailable === true;
  // If the model omitted this flag but supplied a complete valid plan, infer
  // availability from the plan. Never infer availability from an incomplete plan.
  const myExecutionAvailable = modelSaysAvailable ||
    (candidate.myExecutionAvailable === undefined && hasValidPlanShape);

  const requestedType = asString(
    candidate.visualizationType,
    asString(rawPlan?.type, "generic")
  );
  const visualizationType = ALLOWED_VISUALIZATION_TYPES.has(requestedType)
    ? requestedType
    : "generic";

  if (!ALLOWED_VISUALIZATION_TYPES.has(requestedType)) {
    issues.push("visualizationType");
  }
  if (typeof candidate.myExecutionAvailable !== "boolean") {
    issues.push("myExecutionAvailable");
  }
  if (!Array.isArray(candidate.techniques)) issues.push("techniques");
  if (!Array.isArray(candidate.dataStructures)) issues.push("dataStructures");
  if (!Array.isArray(candidate.variablesToTrack)) issues.push("variablesToTrack");

  const normalized = {
    ...candidate,
    algorithm,
    variant,
    confidence: asConfidence(candidate.confidence),
    explanation: asString(
      candidate.explanation,
      "The model did not provide a detailed explanation for this solution."
    ),
    techniques: normalizeStringArray(candidate.techniques),
    dataStructures: normalizeDataStructures(candidate.dataStructures),
    complexity: {
      time: timeComplexity,
      space: spaceComplexity,
    },
    visualizationType,
    visualizationReason: asString(
      candidate.visualizationReason,
      "Visualization selected from the available code structure."
    ),
    variablesToTrack: normalizeVariables(candidate.variablesToTrack),
    myExecutionAvailable,
    myExecutionUnavailableReason: asString(
      candidate.myExecutionUnavailableReason,
      myExecutionAvailable
        ? ""
        : "The AI could not provide a sufficiently complete trace of the submitted implementation."
    ),
    language: typeof language === "string" ? language : "unknown",
  };

  // Keep the plan only if it passes the existing strict frontend contract.
  if (myExecutionAvailable && hasValidPlanShape) {
    normalized.visualizationPlan = rawPlan;
  } else {
    delete normalized.visualizationPlan;
    normalized.myExecutionAvailable = false;
    if (!normalized.myExecutionUnavailableReason) {
      normalized.myExecutionUnavailableReason =
        "The submitted-code trace did not pass visualization validation.";
    }
    if (candidate.visualizationPlan !== undefined && !hasValidPlanShape) {
      issues.push("visualizationPlan");
    }
  }

  return { analysis: normalized, issues: [...new Set(issues)] };
}

function isOptimalExecution(value) {
  if (
    !isObject(value) ||
    typeof value.available !== "boolean" ||
    typeof value.reason !== "string"
  ) {
    return false;
  }

  if (!value.available) return true;

  return (
    typeof value.algorithm === "string" &&
    value.algorithm.trim().length > 0 &&
    typeof value.explanation === "string" &&
    value.explanation.trim().length > 0 &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0.65 &&
    isObject(value.complexity) &&
    typeof value.complexity.time === "string" &&
    value.complexity.time.trim().length > 0 &&
    typeof value.complexity.space === "string" &&
    value.complexity.space.trim().length > 0 &&
    typeof value.visualizationType === "string" &&
    ALLOWED_VISUALIZATION_TYPES.has(value.visualizationType) &&
    isVisualizationPlan(value.visualizationPlan) &&
    value.visualizationPlan.type === value.visualizationType &&
    value.visualizationPlan.completion?.status === "completed" &&
    Object.prototype.hasOwnProperty.call(
      value.visualizationPlan.completion,
      "returnValue"
    )
  );
}

// Return actionable validation failures rather than a generic unavailable message.
function getOptimalValidationIssues(value) {
  const issues = [];

  if (!isObject(value)) {
    return ["the AI response is not a JSON object"];
  }

  if (typeof value.available !== "boolean") {
    issues.push("available must be a boolean");
  } else if (value.available !== true) {
    issues.push("the model marked the optimal analysis unavailable");
  }

  if (typeof value.reason !== "string" || !value.reason.trim()) {
    issues.push("reason is missing or invalid");
  }
  if (typeof value.algorithm !== "string" || !value.algorithm.trim()) {
    issues.push("algorithm is missing or invalid");
  }
  if (typeof value.explanation !== "string" || !value.explanation.trim()) {
    issues.push("explanation is missing or invalid");
  }
  if (typeof value.confidence !== "number" || !Number.isFinite(value.confidence)) {
    issues.push("confidence must be a finite number");
  } else if (value.confidence < 0.65) {
    issues.push(`confidence ${value.confidence} is below the required 0.65`);
  } else if (value.confidence > 1 || value.confidence < 0) {
    issues.push("confidence must be between 0 and 1");
  }

  if (!isObject(value.complexity)) {
    issues.push("complexity object is missing");
  } else {
    if (typeof value.complexity.time !== "string" || !value.complexity.time.trim()) {
      issues.push("complexity.time is missing or invalid");
    }
    if (typeof value.complexity.space !== "string" || !value.complexity.space.trim()) {
      issues.push("complexity.space is missing or invalid");
    }
  }

  if (
    typeof value.visualizationType !== "string" ||
    !ALLOWED_VISUALIZATION_TYPES.has(value.visualizationType)
  ) {
    issues.push("visualizationType is missing or not supported");
  }

  const plan = value.visualizationPlan;
  if (!isObject(plan)) {
    issues.push("visualizationPlan is missing or not an object");
  } else {
    if (typeof plan.type !== "string" || !ALLOWED_VISUALIZATION_TYPES.has(plan.type)) {
      issues.push("visualizationPlan.type is missing or not supported");
    }
    if (typeof value.visualizationType === "string" && plan.type !== value.visualizationType) {
      issues.push("visualizationPlan.type does not match visualizationType");
    }
    if (typeof plan.title !== "string" || !plan.title.trim()) {
      issues.push("visualizationPlan.title is missing");
    }
    if (typeof plan.reason !== "string" || !plan.reason.trim()) {
      issues.push("visualizationPlan.reason is missing");
    }
    if (!isVisualizationState(plan.initialState)) {
      issues.push("visualizationPlan.initialState is invalid");
    }
    if (!Array.isArray(plan.steps) || plan.steps.length === 0) {
      issues.push("visualizationPlan.steps must contain at least one step");
    } else if (!isVisualizationPlan(plan)) {
      issues.push("one or more visualization steps have an invalid state or field");
    }
    if (!isObject(plan.completion)) {
      issues.push("visualizationPlan.completion is missing");
    } else {
      if (plan.completion.status !== "completed") {
        issues.push(`completion.status is ${String(plan.completion.status)}, expected completed`);
      }
      if (!Object.prototype.hasOwnProperty.call(plan.completion, "returnValue")) {
        issues.push("completion.returnValue is missing");
      }
    }
  }

  return [...new Set(issues)];
}

function getUnavailableOptimal(reason) {
  return {
    available: false,
    unavailableReason: reason,
  };
}

const MAX_CACHE_SIZE = 50;
const analysisCache = new Map();
const optimalAnalysisCache = createOptimalAnalysisCache(MAX_CACHE_SIZE);

async function generateOptimalExecution(problem, selectedExample) {
  const optimalPrompt = `
You are an algorithm specialist selecting and tracing an efficient solution.
This request is deliberately independent of the submitted implementation.
Do not use, mention, imitate, or infer from any user's source code or code
analysis. Select an appropriate efficient or best-known algorithm from the
problem statement alone, then trace that algorithm on the selected example.

If the problem, constraints, or example are insufficient to identify a
reliable approach, return available=false and explain why. Do not fabricate an
algorithm, expected output, state, or complexity. Mark confidence below 0.65
when the approach is uncertain.

Return ONLY JSON:
{
  "available": true,
  "reason": "why this independently selected approach is appropriate",
  "algorithm": "algorithm name",
  "explanation": "concise explanation",
  "confidence": 0.0,
  "complexity": {"time": "string", "space": "string"},
  "visualizationType": "one allowed visualization type",
  "visualizationPlan": {
    "type": "same visualization type",
    "title": "string",
    "reason": "string",
    "initialState": {
      "arrays": [], "maps": [], "graphs": [], "linearStructures": [],
      "sets": [], "recursionStacks": [],
      "trees": [], "tables": [], "variables": []
    },
    "completion": {"status": "completed", "returnValue": "result"},
    "steps": [
      {"message": "operation", "operation": "operation", "state": {
        "arrays": [], "maps": [], "graphs": [], "linearStructures": [],
        "sets": [], "recursionStacks": [],
        "trees": [], "tables": [], "variables": []
      }}
    ]
  }
}

Allowed types: ${Array.from(ALLOWED_VISUALIZATION_TYPES).join(", ")}.

OBJECTIVE:
Generate an illustrative execution of a clean, efficient and
well-known approach to solving the given problem.

The goal is to demonstrate how a good reference solution would work.
Do not spend effort proving mathematical optimality or finding an
exotic or theoretically best algorithm.

Choose a reasonable and commonly accepted approach that:
- Solves the given problem correctly.
- Has sensible time and space complexity.
- Is easy to understand and visualize.
- Demonstrates meaningful algorithmic steps.

Do not use or analyze the user's submitted source code.
Independently select the reference approach using only the
problem statement, constraints and selected example.

VISUALIZATION INSTRUCTIONS:

1. Generate 8-12 meaningful execution steps.
2. Use the actual input values from the selected example.
3. Show how the algorithm progresses from initial state to final result.
4. Keep each step concise and easy to understand.
5. Update the visualization state logically after every operation.
6. Highlight important indices, elements, variables and intermediate results.
7. Avoid unnecessary or repetitive states.
8. The final state and returnValue must represent the correct output
   for the selected example.
9. Do not fabricate operations or intermediate results.
10. The trace should be understandable to a student learning algorithms.

STRICT VISUALIZATION STATE SCHEMA:

Every initialState and every step.state MUST be a JSON object
containing all nine fields below.

Every field MUST be an array, even when the algorithm does not use
that particular visualization structure.

1. arrays:
   [
     {
       "name": "nums",
       "values": [1, 2, 3],
       "activeIndices": [],
       "highlightedIndices": [],
       "processedIndices": []
     }
   ]

2. maps:
   [
     {
       "name": "frequencyMap",
       "entries": {}
     }
   ]

3. sets:
   [
     {
       "name": "visited",
       "items": [],
       "highlightedItems": []
     }
   ]

4. graphs:
   [
     {
       "name": "graph",
       "nodes": [
         {"id": "A", "label": "A"}
       ],
       "edges": [
         {"from": "A", "to": "B"}
       ]
     }
   ]

5. linearStructures:
   [
     {
       "name": "queue",
       "kind": "queue",
       "items": []
     }
   ]

   kind MUST be exactly one of:
   "stack", "queue", "linked_list".

6. recursionStacks:
   [
     {
       "name": "calls",
       "frames": [
         {
           "id": "call-1",
           "label": "solve()",
           "variables": [
             {"name": "n", "role": "Current input"}
           ]
         }
       ]
     }
   ]

7. trees:
   [
     {
       "name": "tree",
       "nodes": [
         {
           "id": "root",
           "label": "1",
           "leftId": null,
           "rightId": null
         }
       ]
     }
   ]

   Every non-null leftId and rightId MUST reference an
   existing node in the same tree.

8. tables:
   [
     {
       "name": "dp",
       "values": [[0, 1], [1, 2]]
     }
   ]

9. variables:
   [
     {
       "name": "index",
       "role": "Current index"
     }
   ]

IMPORTANT VALIDATION RULES:

- Always include all nine fields in every state.
- Use [] for unused visualization structures.
- Never use null instead of an array.
- Every visualization item must follow its required structure.
- Every array index must be a valid index in its values array.
- Every graph node must have a string id and label.
- Every graph edge must have string from and to fields.
- Every tree child reference must point to an existing node.
- Every recursion frame must have a string id and label.
- Every variable must have a string name and role.
- Do not introduce unsupported fields or invalid data types.
- Keep the state format consistent between initialState and all steps.

TRACE COMPLETION:

The visualizationPlan must contain:
- A meaningful title.
- A concise reason describing the chosen approach.
- A valid initialState.
- At least one valid execution step.
- completion.status set to "completed".
- completion.returnValue containing the correct example output.

The visualizationType and visualizationPlan.type MUST match.

Return ONLY valid JSON.
Do not include Markdown, explanations outside JSON, or code fences.

PROBLEM:
${JSON.stringify(problem, null, 2)}

SELECTED EXAMPLE:
${JSON.stringify(selectedExample, null, 2)}
`;

  const response = await client.responses.create({
    model: MODEL_NAME,
    input: optimalPrompt,
  });
  if (!response.output_text) {
    throw new Error("The independent analysis returned no content.");
  }

  const candidate = parseModelJson(response.output_text);

  if (!isObject(candidate)) {
    console.warn("[AlgoLens] Optimal Execution response was not a JSON object.");
    return getUnavailableOptimal("The AI response was not a valid JSON object.");
  }

  if (candidate.available === false) {
    const reason =
      typeof candidate.reason === "string" && candidate.reason.trim()
        ? candidate.reason.trim()
        : "The model marked the independent approach unavailable without explaining why.";
    console.warn("[AlgoLens] Optimal Execution unavailable by model decision:", reason);
    return getUnavailableOptimal(reason);
  }

  // Remove unsafe array pointers before checking the trace contract.
  sanitizeVisualizationPlan(candidate.visualizationPlan);

  const validationIssues = getOptimalValidationIssues(candidate);
  if (validationIssues.length > 0 || !isOptimalExecution(candidate)) {
    if (validationIssues.length === 0) {
      validationIssues.push("the response did not satisfy the complete optimal-execution schema");
    }
    console.warn(
      "[AlgoLens] Optimal Execution validation failures:",
      validationIssues
    );
    return getUnavailableOptimal(
      `Optimal execution rejected: ${validationIssues.join("; ")}`
    );
  }

  const outputMatches = matchesExpectedOutput(
    selectedExample.outputText,
    candidate.visualizationPlan.completion.returnValue
  );
  if (outputMatches === false) {
    console.warn("[AlgoLens] Optimal Execution return value did not match the example output.", {
      expected: selectedExample.outputText,
      actual: candidate.visualizationPlan.completion.returnValue,
    });
    return getUnavailableOptimal(
      "The independent trace's final result does not match the selected example's expected output."
    );
  }

  candidate.visualizationPlan.steps =
    candidate.visualizationPlan.steps.slice(0, 30);
  const { reason, ...availableOptimal } = candidate;
  return {
    ...availableOptimal,
    available: true,
    language: "language-agnostic",
    explanation: `${candidate.explanation} ${reason}`.trim(),
    visualizationPlan: candidate.visualizationPlan,
  };
}

function getOptimalExecution(problem, selectedExample, retry = false) {
  if (
    !isObject(problem) ||
    typeof problem.title !== "string" ||
    !selectedExample
  ) {
    return Promise.resolve(
      getUnavailableOptimal(
        "A problem statement and selected example are required to identify an independent approach."
      )
    );
  }

  const cacheKey = getOptimalCacheKey(problem, selectedExample);
  return optimalAnalysisCache
    .get(
      cacheKey,
      () => generateOptimalExecution(problem, selectedExample),
      retry
    )
    .catch((error) => {
      console.error("Independent optimal analysis failed:", error.message);
      return getUnavailableOptimal(
        `Independent optimal analysis failed: ${error.message}`
      );
    });
}

// Analyze the submitted implementation, then independently analyze an
// efficient approach using only the problem and selected example.
app.post("/analyze", async (req, res) => {
  if (!process.env.AZURE_AI_API_KEY) {
    return res.status(503).json({
      error: "AZURE_AI_API_KEY is not configured in backend/.env.",
    });
  }

  const {
    code,
    language,
    model,
    problem,
    selectedExample,
    retryOptimal = false,
    skipMyExecution = false,
    skipOptimalExecution = false,
  } = req.body;

  const hasCode = typeof code === "string" && Boolean(code.trim());
  const sourceTooLarge =
    typeof code === "string" && code.length > 100_000;

  // Check cache for identical problem, code, and example input
  const cacheKey = JSON.stringify([
    problem ?? null,
    selectedExample ?? null,
    hasCode ? code.trim() : null,
    language ?? null,
    model ?? null,
  ]);
  if (
    !retryOptimal &&
    !skipMyExecution &&
    !skipOptimalExecution &&
    analysisCache.has(cacheKey)
  ) {
    console.log(`[AlgoLens] ✅ Cache HIT for "${problem?.title}" Example ${selectedExample?.id ?? 1}`);
    return res.json({ analysis: analysisCache.get(cacheKey) });
  }

  let optimalPromise = Promise.resolve(
    getUnavailableOptimal(
      "Optimal Execution was not requested for this analysis."
    )
  );
  let analysis = {
    algorithm: "Unavailable",
    variant: "",
    confidence: 0,
    explanation: "The submitted implementation could not be analyzed.",
    techniques: [],
    dataStructures: [],
    complexity: { time: "Unavailable", space: "Unavailable" },
    visualizationType: "generic",
    visualizationReason: "No code-specific visualization is available.",
    variablesToTrack: [],
    myExecutionAvailable: false,
    myExecutionUnavailableReason:
      "No source code was provided for My Execution.",
    language: typeof language === "string" ? language : "unknown",
  };

  try {
    console.log(`[AlgoLens] ❌ Cache MISS for "${problem?.title}" Example ${selectedExample?.id ?? 1}`);
    const azureStart = Date.now();
    if (!skipOptimalExecution) {
      optimalPromise = getOptimalExecution(
        problem,
        selectedExample,
        retryOptimal
      );
    }

    console.log(
      problem
        ? `[AlgoLens] Problem: ${problem.title || "Title unavailable"}`
        : "[AlgoLens] No problem statement provided"
    );

    if (selectedExample) {
      console.log(`[AlgoLens] Targeting Example ${selectedExample.id}`);
    }

    if (!hasCode || skipMyExecution || sourceTooLarge) {
      analysis.myExecutionUnavailableReason = skipMyExecution
        ? "My Execution was skipped so the independent Optimal Execution could be retried."
        : sourceTooLarge
          ? "Submitted source code is too large for safe My Execution analysis."
          : "No submitted source code is available for My Execution.";
    } else {
    const prompt = `
You are AlgoLens, an intelligent algorithm-analysis and
visualization-planning agent.

Your job is to understand the user's actual source code and create
a structured visualization plan that a generic frontend renderer
can display.

Analyze:
1. The algorithm and its variant.
2. The techniques and data structures used.
3. Time and auxiliary space complexity.
4. The most appropriate visualization type.
5. The state of the algorithm before visualization starts.
6. Ordered state changes that explain the algorithm step by step.

Use the problem statement, source code, and structured code model
together. Do not assume the code correctly solves the problem.

Return ONLY valid JSON with this structure:

{
  "myExecutionAvailable": true,
  "myExecutionUnavailableReason": "",
  "language": "string",
  "algorithm": "string",
  "variant": "string",
  "confidence": 0.0,
  "explanation": "string",
  "techniques": ["string"],
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
  },
  "visualizationType": "string",
  "visualizationReason": "string",
  "variablesToTrack": [
    {
      "name": "string",
      "role": "string"
    }
  ],
  "visualizationPlan": {
    "type": "string",
    "title": "string",
    "reason": "string",
    "initialState": {
      "arrays": [],
      "maps": [],
      "sets": [],
      "graphs": [],
      "linearStructures": [],
      "recursionStacks": [],
      "trees": [],
      "tables": [],
      "variables": []
    },
    "completion": {
      "status": "completed",
      "returnValue": "the result returned by this implementation"
    },
    "steps": [
      {
        "message": "string",
        "operation": "string",
        "state": {
          "arrays": [],
          "maps": [],
          "sets": [],
          "graphs": [],
          "linearStructures": [],
          "recursionStacks": [],
          "trees": [],
          "tables": [],
          "variables": []
        }
      }
    ]
  }
}
If the submitted implementation cannot be followed with confidence, set
myExecutionAvailable=false, include myExecutionUnavailableReason, and omit
visualizationPlan. Do not substitute a generic solution.

ALLOWED VISUALIZATION TYPES:
- array
- array_hashmap
- hashmap
- two_pointers
- sliding_window
- binary_search
- linked_list
- stack
- queue
- graph
- graph_traversal
- grid
- grid_traversal
- matrix
- tree
- tree_traversal
- dynamic_programming
- sorting
- backtracking
- heap
- generic

STATE FORMATS:

Arrays:
{
  "name": "nums",
  "values": [2, 7, 11, 15],
  "activeIndices": [0],
  "highlightedIndices": []
}

Sets:
{"name":"visited","items":["A","B"],"highlightedItems":["B"]}

Recursive call frames:
{
  "name":"dfs",
  "frames":[
    {"id":"dfs-A","label":"dfs(A)","variables":[{"name":"node","role":"Current node","value":"A"}],"active":true}
  ]
}

Maps:
{
  "name": "mp",
  "entries": {"2": 0},
  "highlightedKeys": ["2"]
}

Graphs:
{
  "name": "graph",
  "directed": false,
  "nodes": [
    {"id": "A", "label": "A", "visited": true, "active": true},
    {"id": "B", "label": "B", "visited": false, "active": false}
  ],
  "edges": [
    {"from": "A", "to": "B", "highlighted": true}
  ]
}

Stacks and queues:
{
  "name": "worklist",
  "kind": "stack",
  "items": [1, 2, 3],
  "activeIndex": 2
}

Trees:
{
  "name": "tree",
  "nodes": [
    {"id": "1", "label": "10", "leftId": "2", "rightId": "3"},
    {"id": "2", "label": "5", "parentId": "1", "leftId": null, "rightId": null},
    {"id": "3", "label": "15", "parentId": "1", "leftId": null, "rightId": null}
  ]
}

Dynamic programming tables:
{
  "name": "dp",
  "values": [[0, 1], [1, 2]],
  "activeCell": {"row": 1, "column": 1}
}

Variables:
{
  "name": "i",
  "role": "Current array index",
  "value": 0
}

VISUALIZATION RULES:
- This is My Execution. Analyze only the submitted implementation below. Do
  not substitute a canonical solution or silently repair incorrect code.
- Set myExecutionAvailable=false with a specific reason and omit the plan if
  the code's algorithm or state transitions cannot be followed reliably.
- Every state transition must follow the actual code's operations and control
  flow. Do not invent operations, data structures, or a successful result.
- Include the exact terminal result in visualizationPlan.completion when it
  can be determined from the selected input. Mark status unknown otherwise.
- Choose visualizationType based on the actual implementation,
  not merely the problem title.
- Multiple structures can be represented together in the same state.
- Use sets for membership-only state such as visited nodes; use recursionStacks
  for recursive call frames and their local variables. Do not flatten these
  into unrelated variables or array values.
- Use arrays for array traversal and sorting.
- Use arrays and maps together for hash-map algorithms.
- Use graph nodes and edges for genuine node-edge graph algorithms.
- For 2D grids, boards, or matrices (e.g. Number of Islands, Word Search, Unique Paths, Flood Fill), choose "grid" or "grid_traversal". Represent the grid as a 2D array in arrays (e.g. {"name": "grid", "values": [...]}) or tables, with active coordinates r and c in variables. NEVER represent a 2D grid as a flattened node-edge graph.
- Use linearStructures with kind "stack", "queue", or "linked_list" for those data structures.
- Use trees for tree traversal and heap-like tree layouts when suitable.
- For binary trees, preserve child-side relationships with leftId and
  rightId fields on every node, including leaves. Each field must be the
  referenced child node ID or null when that side has no child. A binary
  node with only one child must still identify which side it occupies.
  Keep parentId consistent with these references when parentId is supplied.
  Never infer left/right child side from node values or child list order.
- Use tables for dynamic programming.
- Use generic when the algorithm cannot be identified reliably.
- The plan type and visualizationType must be identical.
- initialState represents the state before the first operation.
- Every step.state represents the complete state AFTER that step.
- A step may omit unchanged structure categories; the frontend retains their
  previous values. Use an explicit empty array to clear a category.
- Variables describe only the current step and are not carried forward.
- When a sequence is fully processed, set processedIndices to all processed
  valid positions, omit those positions from activeIndices, and represent a
  loop index at length as the next position rather than highlighting a cell.
- Use null for a current-element variable when no element is being processed.
- Do not create an array pointer for an index outside the array bounds.
- Preserve previous changes in later states unless an operation
  changes them.
- Include meaningful variable values and active/highlighted items.
- Use empty arrays for irrelevant structure categories.
- Use actual variable names from the source code when possible.
- Keep messages concise and educational.
- Generate between 1 and 30 steps.
- Do not generate enormous traces for large inputs.
- When no concrete input is available, use a small illustrative
  example and disclose this in the plan reason.
- Never claim an illustrative trace is the exact execution of
  the user's source code.
- If execution is ambiguous, lower confidence and explain why.
- Do not invent a successful result unsupported by the code.
- confidence must be between 0 and 1.
- Return JSON only, without Markdown fences.

PROBLEM STATEMENT:
${problem ? JSON.stringify(problem, null, 2) : "Not provided"}

${
  selectedExample
    ? `TARGET EXAMPLE TO VISUALIZE:
Example ${selectedExample.id}:
Input: ${selectedExample.inputText}
Expected Output: ${selectedExample.outputText}
${selectedExample.explanation ? `Explanation: ${selectedExample.explanation}` : ""}

CRITICAL: Base the visualization initialState and execution trace specifically on THIS example's input! Step through the algorithm with this concrete input.`
    : ""
}

ORIGINAL SOURCE CODE:
${code}

SOURCE LANGUAGE:
${typeof language === "string" ? language : "unknown"}

STRUCTURED CODE MODEL:
${model ? JSON.stringify(model, null, 2) : "Not provided"}
`;

    const response = await client.responses.create({
      model: MODEL_NAME,
      input: prompt,
    });

    console.log(`[AlgoLens] ⏱️ Azure responded in ${Date.now() - azureStart}ms`);

    const raw = response.output_text;

    if (!raw) {
      throw new Error("Azure AI returned an empty response.");
    }
    console.log(`[AlgoLens] AI response received (${raw.length} characters)`);

    const modelAnalysis = parseModelJson(raw);
    const normalizedResult = normalizeAnalysis(modelAnalysis, language);
    analysis = normalizedResult.analysis;

    if (normalizedResult.issues.length > 0) {
      console.warn(
        "[AlgoLens] AI response fields normalized or defaulted:",
        normalizedResult.issues
      );
    }

    if (analysis.myExecutionAvailable) {
      sanitizeVisualizationPlan(analysis.visualizationPlan);
      if (!isVisualizationPlan(analysis.visualizationPlan)) {
        analysis.myExecutionAvailable = false;
        analysis.myExecutionUnavailableReason =
          "The submitted-code trace did not pass visualization validation.";
        delete analysis.visualizationPlan;
      } else {
        // Keep the frontend's selected type and trace type consistent.
        analysis.visualizationType = analysis.visualizationPlan.type;
        analysis.visualizationPlan.steps =
          analysis.visualizationPlan.steps.slice(0, 30);
      }
    } else {
      delete analysis.visualizationPlan;
    }
    }

    const optimalExecution = await optimalPromise;
    analysis.optimalExecution = optimalExecution;

    console.log("Algorithm:", analysis.algorithm);
    console.log(
      "Visualization type:",
      analysis.visualizationType
    );
    console.log(
      "Visualization steps:",
      analysis.visualizationPlan?.steps.length ?? 0
    );

    // Cache analysis with bounded size (FIFO eviction)
    if (analysisCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = analysisCache.keys().next().value;
      analysisCache.delete(oldestKey);
      console.log("♻️ Cache evicted oldest entry");
    }
    if (analysis.myExecutionAvailable) {
      analysisCache.set(cacheKey, analysis);
    }

    res.json({ analysis });
  } catch (error) {
    console.error(
      "Algorithm analysis failed:",
      error.status || "",
      error.message
    );

    analysis.myExecutionAvailable = false;
    analysis.myExecutionUnavailableReason =
      `Submitted-code analysis failed: ${error.message}`;
    analysis.optimalExecution = await optimalPromise.catch((optimalError) => {
      console.error("[AlgoLens] Optimal analysis failed:", optimalError.message);
      return getUnavailableOptimal(optimalError.message);
    });
    return res.json({
      analysis,
    });
  }
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(
    `AlgoLens backend running at http://127.0.0.1:${PORT}`
  );

  if (!process.env.AZURE_AI_API_KEY) {
    console.error(
      "Warning: AZURE_AI_API_KEY is missing from the backend environment."
    );
  }
});