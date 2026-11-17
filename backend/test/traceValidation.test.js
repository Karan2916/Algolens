const test = require("node:test");
const assert = require("node:assert/strict");
const { matchesExpectedOutput } = require("../traceValidation");

test("final result validation compares JSON-shaped LeetCode outputs", () => {
  assert.equal(matchesExpectedOutput("[0,1]", [0, 1]), true);
  assert.equal(matchesExpectedOutput("true", true), true);
  assert.equal(matchesExpectedOutput("[0,1]", [1, 0]), false);
  assert.equal(matchesExpectedOutput("false", true), false);
});

test("non-JSON output can be compared textually and missing results remain unknown", () => {
  assert.equal(matchesExpectedOutput("1->2->3", "1->2->3"), true);
  assert.equal(matchesExpectedOutput("1->2->3", "1->3"), false);
  assert.equal(matchesExpectedOutput("anything", undefined), null);
});
