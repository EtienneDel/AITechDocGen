import * as core from "@actions/core";

// Store timing points in a Map
const timers = new Map<string, number>();

// Start timing with a label
export const startTimer = (label: string): void => {
  timers.set(label, performance.now());
  core.info(`[Timer] Started: ${label}`);
};

// End timing and log the result
export const endTimer = (label: string): void => {
  const startTime = timers.get(label);
  if (startTime === undefined) {
    core.warning(`[Timer] No timer found with label: ${label}`);
    return;
  }

  const duration = performance.now() - startTime;
  core.info(`[Timer] ${label}: ${duration.toFixed(2)}ms`);
  timers.delete(label);
};
