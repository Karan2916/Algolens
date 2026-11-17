const { isDeepStrictEqual } = require("node:util");

function comparableValue(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value.trim();
  }
}

function matchesExpectedOutput(expectedOutput, actualOutput) {
  if (typeof expectedOutput !== "string" || actualOutput === undefined) {
    return null;
  }
  return isDeepStrictEqual(
    comparableValue(expectedOutput),
    comparableValue(actualOutput)
  );
}

module.exports = { matchesExpectedOutput };
