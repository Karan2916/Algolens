const test = require("node:test");
const assert = require("node:assert/strict");
const { sanitizeVisualizationPlan } = require("../traceState");

function repeatedPairCancellation(input) {
  let remaining = input;
  const states = [remaining];
  let previous;
  do {
    previous = remaining;
    remaining = remaining.replace(/\(\)|\[\]|\{\}/g, "");
    if (remaining !== previous) states.push(remaining);
  } while (remaining !== previous);
  return { valid: remaining.length === 0, states };
}

function stackValidation(input) {
  const stack = [];
  const pairs = new Map([[")", "("], ["]", "["], ["}", "{"]]);
  const states = [];
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (pairs.has(character)) {
      if (stack.pop() !== pairs.get(character)) {
        states.push({ index, character, stack: [...stack], result: false });
        return { valid: false, states };
      }
    } else {
      stack.push(character);
    }
    states.push({ index, character, stack: [...stack] });
  }
  return { valid: stack.length === 0, states };
}

test("Valid Parentheses examples produce the expected independent algorithm results", () => {
  const cases = [
    ["()[]{}", true],
    ["(]", false],
    ["([)]", false],
    ["", true],
    ["(((", false],
  ];

  for (const [input, expected] of cases) {
    assert.equal(repeatedPairCancellation(input).valid, expected, `scan: ${input}`);
    assert.equal(stackValidation(input).valid, expected, `stack: ${input}`);
  }
});

test("scan and stack execution fixtures have independent state sequences", () => {
  const input = "()[]{}";
  const scan = repeatedPairCancellation(input);
  const stack = stackValidation(input);

  assert.notDeepEqual(scan.states, stack.states);
  assert.equal(scan.states.at(-1), "");
  assert.deepEqual(stack.states.at(-1).stack, []);
  assert.ok(scan.states.length !== stack.states.length);
});

test("completed array state drops out-of-range active cell but retains processed indices and return", () => {
  const plan = {
    type: "stack",
    initialState: {
      arrays: [{ name: "s", values: ["(", ")", "[", "]", "{", "}"] }],
    },
    steps: [{
      message: "Return true",
      state: {
        arrays: [{
          name: "s",
          values: ["(", ")", "[", "]", "{", "}"],
          activeIndices: [6],
          processedIndices: [0, 1, 2, 3, 4, 5],
          pointers: [{ name: "i", index: 6 }],
        }],
        variables: [
          { name: "i", role: "Next character index", value: 6 },
          { name: "c", role: "Current character", value: null },
          { name: "return", role: "Result", value: true },
        ],
        linearStructures: [{ name: "stack", kind: "stack", items: [] }],
      },
    }],
    completion: { status: "completed", returnValue: true },
  };

  sanitizeVisualizationPlan(plan);

  const finalState = plan.steps[0].state;
  assert.deepEqual(finalState.arrays[0].activeIndices, []);
  assert.deepEqual(finalState.arrays[0].processedIndices, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(finalState.arrays[0].pointers, []);
  assert.equal(finalState.variables.find((item) => item.name === "i").value, 6);
  assert.equal(finalState.variables.find((item) => item.name === "c").value, null);
  assert.deepEqual(finalState.linearStructures[0].items, []);
  assert.equal(plan.completion.returnValue, true);
});

test("sanitization preserves structure-specific state across renderer categories", () => {
  const plan = {
    type: "generic",
    initialState: {
      arrays: [{ name: "grid", values: [[1, 0], [0, 1]] }],
      maps: [{ name: "memo", entries: { "0,0": 1 } }],
      sets: [{ name: "visited", items: ["0,0"] }],
      graphs: [{
        name: "graph",
        nodes: [
          { id: "A", label: "A", visited: true },
          { id: "B", label: "B", visited: false },
        ],
        edges: [{ from: "A", to: "B" }],
      }],
      linearStructures: [{ name: "queue", kind: "queue", items: ["B"] }],
      recursionStacks: [{
        name: "dfs",
        frames: [{ id: "dfs-A", label: "dfs(A)", active: true }],
      }],
      trees: [{
        name: "tree",
        nodes: [{ id: "root", label: "1", leftId: null, rightId: null }],
      }],
      tables: [{ name: "dp", values: [[0, 1], [1, 2]] }],
      variables: [{ name: "r", role: "Row", value: 0 }],
    },
    steps: [],
  };

  sanitizeVisualizationPlan(plan);

  assert.deepEqual(plan.initialState.sets[0].items, ["0,0"]);
  assert.equal(plan.initialState.recursionStacks[0].frames[0].active, true);
  assert.deepEqual(plan.initialState.graphs[0].edges, [{ from: "A", to: "B" }]);
  assert.deepEqual(plan.initialState.arrays[0].values, [[1, 0], [0, 1]]);
  assert.deepEqual(plan.initialState.tables[0].values, [[0, 1], [1, 2]]);
});
