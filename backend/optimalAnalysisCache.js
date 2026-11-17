function getOptimalCacheKey(problem, selectedExample) {
  return JSON.stringify([
    problem.title,
    problem.description,
    problem.difficulty,
    selectedExample.id,
    selectedExample.inputText,
    selectedExample.outputText,
    selectedExample.explanation,
  ]);
}

function createOptimalAnalysisCache(maxEntries = 50) {
  const cache = new Map();
  const pending = new Map();

  function get(key, generate, retry = false) {
    if (!retry && cache.has(key)) {
      return Promise.resolve(cache.get(key));
    }
    if (!retry && pending.has(key)) {
      return pending.get(key);
    }

    const request = Promise.resolve()
      .then(generate)
      .then((result) => {
        if (result?.available) {
          if (cache.size >= maxEntries) {
            cache.delete(cache.keys().next().value);
          }
          cache.set(key, result);
        }
        return result;
      })
      .finally(() => {
        if (pending.get(key) === request) {
          pending.delete(key);
        }
      });

    pending.set(key, request);
    return request;
  }

  return { get };
}

module.exports = { createOptimalAnalysisCache, getOptimalCacheKey };
