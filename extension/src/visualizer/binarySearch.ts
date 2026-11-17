
export interface BinarySearchStep {
  left: number;
  mid: number;
  right: number;
  values: number[];
  target: number;
  message: string;
  found: boolean;
  done: boolean;
}

export function simulateBinarySearch(
  values: number[],
  target: number
): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];

  let left = 0;
  let right = values.length - 1;

  while (left <= right) {
    const mid = left + Math.floor((right - left) / 2);
    const current = values[mid];

    if (current === undefined) break;

    steps.push({
      left,
      mid,
      right,
      values: [...values],
      target,
      message: `Compare ${current} with target ${target}.`,
      found: current === target,
      done: false,
    });

    if (current === target) {
      steps.push({
        left,
        mid,
        right,
        values: [...values],
        target,
        message: `Target ${target} found at index ${mid}.`,
        found: true,
        done: true,
      });

      return steps;
    }

    if (current < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  steps.push({
    left,
    mid: -1,
    right,
    values: [...values],
    target,
    message: `Target ${target} was not found.`,
    found: false,
    done: true,
  });

  return steps;
}
