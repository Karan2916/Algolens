function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sanitizeVisualizationPlan(plan) {
  if (!isObject(plan)) return;

  const sanitizeState = (state) => {
    if (!isObject(state) || !Array.isArray(state.arrays)) return;
    for (const array of state.arrays) {
      if (!isObject(array) || !Array.isArray(array.values)) continue;
      for (const field of ["activeIndices", "highlightedIndices", "processedIndices"]) {
        if (Array.isArray(array[field])) {
          array[field] = array[field].filter(
            (index) =>
              Number.isInteger(index) &&
              index >= 0 &&
              index < array.values.length
          );
        }
      }
      if (Array.isArray(array.pointers)) {
        array.pointers = array.pointers.filter(
          (pointer) =>
            isObject(pointer) &&
            Number.isInteger(pointer.index) &&
            pointer.index >= 0 &&
            pointer.index < array.values.length
        );
      }
    }
  };

  sanitizeState(plan.initialState);
  if (Array.isArray(plan.steps)) {
    for (const step of plan.steps) sanitizeState(step?.state);
  }
}

module.exports = { sanitizeVisualizationPlan };
