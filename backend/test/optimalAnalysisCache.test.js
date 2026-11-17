const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createOptimalAnalysisCache,
  getOptimalCacheKey,
} = require("../optimalAnalysisCache");

const problem = {
  title: "Two Sum",
  description: "Return indices of two values that sum to target.",
  difficulty: "Easy",
};
const example = {
  id: 1,
  inputText: "nums = [2, 7], target = 9",
  outputText: "[0, 1]",
};

test("optimal cache identity uses problem and selected input, not submitted code", () => {
  const firstKey = getOptimalCacheKey(problem, example);
  const sameProblemDifferentCodeKey = getOptimalCacheKey(problem, example);
  const differentInputKey = getOptimalCacheKey(problem, {
    ...example,
    inputText: "nums = [3, 5], target = 8",
  });

  assert.equal(firstKey, sameProblemDifferentCodeKey);
  assert.notEqual(firstKey, differentInputKey);
});

test("optimal generation requests are deduplicated and can be retried", async () => {
  const cache = createOptimalAnalysisCache(2);
  let calls = 0;
  const generate = async () => {
    calls += 1;
    await Promise.resolve();
    return { available: true, algorithm: "Hash map" };
  };
  const key = getOptimalCacheKey(problem, example);

  const [first, concurrent] = await Promise.all([
    cache.get(key, generate),
    cache.get(key, generate),
  ]);
  assert.equal(calls, 1);
  assert.equal(first, concurrent);
  await cache.get(key, generate);
  assert.equal(calls, 1);
  await cache.get(key, generate, true);
  assert.equal(calls, 2);
});

test("unavailable and failed optimal results are not cached", async () => {
  const cache = createOptimalAnalysisCache();
  const key = getOptimalCacheKey(problem, example);
  let calls = 0;

  await cache.get(key, async () => {
    calls += 1;
    return { available: false };
  });
  await cache.get(key, async () => {
    calls += 1;
    throw new Error("temporary failure");
  }).catch(() => undefined);
  await cache.get(key, async () => {
    calls += 1;
    return { available: true };
  });

  assert.equal(calls, 3);
});
