import type {
  VisualizationState,
  VisualizationStep,
} from "../../ai/types";

/**
 * Resolves a playback snapshot while retaining structure categories omitted
 * from a partial step. Explicit empty arrays still clear their category.
 */
export function resolveVisualizationState(
  initialState: VisualizationState,
  steps: VisualizationStep[],
  stepIndex: number
): VisualizationState {
  let state = initialState;
  const lastStepIndex = Math.min(stepIndex, steps.length - 1);

  for (let index = 0; index <= lastStepIndex; index += 1) {
    const stepState = steps[index].state;
    state = {
      arrays: stepState.arrays ?? state.arrays,
      maps: stepState.maps ?? state.maps,
      sets: stepState.sets ?? state.sets,
      graphs: stepState.graphs ?? state.graphs,
      linearStructures:
        stepState.linearStructures ?? state.linearStructures,
      recursionStacks:
        stepState.recursionStacks ?? state.recursionStacks,
      trees: stepState.trees ?? state.trees,
      tables: stepState.tables ?? state.tables,
      variables: stepState.variables,
    };
  }

  return state;
}
