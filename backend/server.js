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
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  return JSON.parse(cleaned);
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
    typeof value.explanation === "string" &&
    typeof value.confidence === "number" &&
    Number.isFinite(value.confidence) &&
    value.confidence >= 0.65 &&
    isObject(value.complexity) &&
    typeof value.complexity.time === "string" &&
    typeof value.complexity.space === "string" &&
    typeof value.visualizationType === "string" &&
    ALLOWED_VISUALIZATION_TYPES.has(value.visualizationType) &&
    isVisualizationPlan(value.visualizationPlan) &&
    value.visualizationPlan.completion?.status === "completed" &&
    Object.prototype.hasOwnProperty.call(
      value.visualizationPlan.completion,
      "returnValue"
    )
  );
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
Use actual input values from the example. Keep the trace to 1-30 steps. Each
step must represent a state transition of this separately selected algorithm.
The plan must be complete and internally consistent. Its state and step
sequence must be independently generated; do not copy any existing trace.
Use the normal visualization data formats for arrays, maps, sets, graphs,
linear structures, recursion stacks, trees, and tables.

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
  if (isObject(candidate)) {
    sanitizeVisualizationPlan(candidate.visualizationPlan);
  }
  if (
    isOptimalExecution(candidate) &&
    candidate.available &&
    candidate.visualizationPlan.type === candidate.visualizationType
  ) {
    if (
      matchesExpectedOutput(
        selectedExample.outputText,
        candidate.visualizationPlan.completion.returnValue
      ) === false
    ) {
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
      explanation: `${candidate.explanation} ${reason}`,
      visualizationPlan: candidate.visualizationPlan,
    };
  }
  if (
    isObject(candidate) &&
    candidate.available === false &&
    typeof candidate.reason === "string"
  ) {
    return getUnavailableOptimal(candidate.reason);
  }
  return getUnavailableOptimal(
    "The independent approach did not meet confidence or trace-validation requirements."
  );
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

    analysis = parseModelJson(raw);
    if (isObject(analysis)) {
      analysis.language =
        typeof language === "string" ? language : "unknown";
    }

    // Validate algorithm analysis.
    if (
      typeof analysis.algorithm !== "string" ||
      typeof analysis.variant !== "string" ||
      typeof analysis.confidence !== "number" ||
      !Number.isFinite(analysis.confidence) ||
      analysis.confidence < 0 ||
      analysis.confidence > 1 ||
      typeof analysis.explanation !== "string" ||
      !Array.isArray(analysis.techniques) ||
      !analysis.techniques.every(
        (item) => typeof item === "string"
      ) ||
      !Array.isArray(analysis.dataStructures) ||
      !analysis.dataStructures.every(
        (item) =>
          isObject(item) &&
          typeof item.name === "string" &&
          typeof item.type === "string" &&
          typeof item.role === "string"
      ) ||
      typeof analysis.myExecutionAvailable !== "boolean" ||
      (
        analysis.myExecutionUnavailableReason !== undefined &&
        typeof analysis.myExecutionUnavailableReason !== "string"
      ) ||
      !isObject(analysis.complexity) ||
      typeof analysis.complexity.time !== "string" ||
      typeof analysis.complexity.space !== "string"
    ) {
      throw new Error("AI returned invalid analysis fields.");
    }

    // Validate visualization selection.
    if (
      typeof analysis.visualizationType !== "string" ||
      typeof analysis.visualizationReason !== "string" ||
      !Array.isArray(analysis.variablesToTrack) ||
      !analysis.variablesToTrack.every(
        (item) =>
          isObject(item) &&
          typeof item.name === "string" &&
          typeof item.role === "string"
      )
    ) {
      throw new Error(
        "AI returned invalid visualization selection fields."
      );
    }

    if (
      !ALLOWED_VISUALIZATION_TYPES.has(
        analysis.visualizationType
      )
    ) {
      analysis.visualizationType = "generic";
    }

    sanitizeVisualizationPlan(analysis.visualizationPlan);
    if (
      analysis.myExecutionAvailable &&
      !isVisualizationPlan(analysis.visualizationPlan)
    ) {
      analysis.myExecutionAvailable = false;
      analysis.myExecutionUnavailableReason =
        "The submitted-code trace did not pass visualization validation.";
      delete analysis.visualizationPlan;
    }

    if (!analysis.myExecutionAvailable) {
      delete analysis.visualizationPlan;
      if (!analysis.myExecutionUnavailableReason) {
        analysis.myExecutionUnavailableReason =
          "The submitted implementation could not be followed reliably.";
      }
    } else {
      analysis.visualizationPlan.type = analysis.visualizationType;
      analysis.visualizationPlan.steps =
        analysis.visualizationPlan.steps.slice(0, 30);
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
    analysis.optimalExecution = await optimalPromise;
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