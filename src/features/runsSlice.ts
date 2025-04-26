import { createSlice, PayloadAction, nanoid, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';

// Define status types for runs, steps, and actions
export type RunStatus = 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';

// Define the structure for action execution data
export interface ActionRun {
  id: string;
  actionId: string; // Reference to the original action
  status: RunStatus;
  startTime: string | null;
  endTime: string | null;
  output: string;
  streamingOutput: boolean;
  error: string | null;
  duration: number | null; // Duration in milliseconds
}

// Define the structure for step execution data
export interface StepRun {
  id: string;
  stepId: string; // Reference to the original step
  status: RunStatus;
  startTime: string | null;
  endTime: string | null;
  duration: number | null; // Duration in milliseconds
  actions: ActionRun[];
}

// Define the structure for flow execution data
export interface Run {
  id: string;
  flowId: string; // Reference to the original flow
  version: number; // Version number of the run, increments on rerun
  status: RunStatus;
  startTime: string | null;
  endTime: string | null;
  duration: number | null; // Duration in milliseconds
  steps: StepRun[];
}

// Define the state structure for runs
interface RunsState {
  runs: {
    byId: Record<string, Run>;
    allIds: string[];
  };
  // Removing activeRunId since we'll now support multiple concurrent runs
}

// Helper to create a default action run
const createDefaultActionRun = (actionId: string): ActionRun => ({
  id: nanoid(),
  actionId,
  status: 'idle',
  startTime: null,
  endTime: null,
  output: '', // Ensure default output is empty
  streamingOutput: false,
  error: null, // Ensure default error is null
  duration: null,
});

// Helper to create a default step run
const createDefaultStepRun = (stepId: string, actionIds: string[]): StepRun => ({
  id: nanoid(),
  stepId,
  status: 'idle',
  startTime: null,
  endTime: null,
  duration: null,
  actions: actionIds.map((actionId) => createDefaultActionRun(actionId)),
});

// Helper to create a default run
const createDefaultRun = (flowId: string, steps: { id: string; actionIds: string[] }[]): Run => ({
  id: nanoid(),
  flowId,
  version: 1,
  status: 'idle',
  startTime: null,
  endTime: null,
  duration: null,
  steps: steps.map((step) => createDefaultStepRun(step.id, step.actionIds)),
});

// Initial state
const initialState: RunsState = {
  runs: {
    byId: {},
    allIds: [],
  },
};

export const runsSlice = createSlice({
  name: 'runs',
  initialState,
  reducers: {
    // Start a new run for a flow
    startRun: {
      prepare: (payload: { flowId: string; steps: { id: string; actionIds: string[] }[] }) => {
        const runId = nanoid();
        return { payload: { ...payload, runId } };
      },
      reducer: (
        state,
        action: PayloadAction<{
          flowId: string;
          steps: { id: string; actionIds: string[] }[];
          runId: string;
        }>,
      ) => {
        const { flowId, steps, runId } = action.payload;
        const newRun = createDefaultRun(flowId, steps);
        newRun.id = runId; // Use the runId generated in prepare
        newRun.status = 'running';
        newRun.startTime = new Date().toISOString();

        state.runs.byId[runId] = newRun;
        state.runs.allIds.push(runId);
      },
    },
    // Clone an existing run for rerunning a step or action
    cloneRun: {
      prepare: (payload: { oldRunId: string; stepIndex: number; actionIndex?: number }) => {
        const newRunId = nanoid();
        return { payload: { ...payload, newRunId } };
      },
      reducer: (
        state,
        action: PayloadAction<{ oldRunId: string; newRunId: string; stepIndex: number; actionIndex?: number }>,
      ) => {
        const { oldRunId, newRunId, stepIndex, actionIndex } = action.payload;
        const oldRun = state.runs.byId[oldRunId];
        if (!oldRun) {
          return;
        }
        // Deep clone the old run
        const newRun: Run = JSON.parse(JSON.stringify(oldRun));
        newRun.id = newRunId;
        // Increment version
        newRun.version = (oldRun.version || 1) + 1;
        // Reset run-level timing and status
        newRun.status = 'running';
        newRun.startTime = new Date().toISOString();
        newRun.endTime = null;
        newRun.duration = null;
        // Reset the specified step
        if (newRun.steps[stepIndex]) {
          const stepToReset = newRun.steps[stepIndex];
          stepToReset.status = 'idle';
          stepToReset.startTime = null;
          stepToReset.endTime = null;
          stepToReset.duration = null;
          // Reset actions within the step
          stepToReset.actions.forEach((actionRun, idx) => {
            if (actionIndex === undefined || idx === actionIndex) {
              actionRun.status = 'idle';
              actionRun.startTime = null;
              actionRun.endTime = null;
              actionRun.duration = null;
              actionRun.output = '';
              actionRun.error = null;
              actionRun.streamingOutput = false;
            }
          });
        }
        state.runs.byId[newRunId] = newRun;
        state.runs.allIds.push(newRunId);
      },
    },
    // Start execution of a step
    startStepRun: (state, action: PayloadAction<{ runId: string; stepIndex: number }>) => {
      const { runId, stepIndex } = action.payload;
      const run = state.runs.byId[runId];

      if (run && run.steps[stepIndex]) {
        const step = run.steps[stepIndex];
        step.status = 'running';
        step.startTime = new Date().toISOString();
      }
    },

    // Complete execution of a step
    completeStepRun: (state, action: PayloadAction<{ runId: string; stepIndex: number }>) => {
      const { runId, stepIndex } = action.payload;
      const run = state.runs.byId[runId];

      if (run && run.steps[stepIndex]) {
        const step = run.steps[stepIndex];
        step.status = 'completed';
        step.endTime = new Date().toISOString();

        if (step.startTime) {
          step.duration = new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
        }

        // Check if all steps are completed to update the run status
        const allStepsCompleted = run.steps.every(
          (s) => s.status === 'completed' || s.status === 'failed',
        );

        if (allStepsCompleted) {
          run.status = 'completed';
          run.endTime = new Date().toISOString();

          if (run.startTime) {
            run.duration = new Date(run.endTime).getTime() - new Date(run.startTime).getTime();
          }
        }
      }
    },

    // Start execution of an action
    startActionRun: (
      state,
      action: PayloadAction<{ runId: string; stepIndex: number; actionIndex: number }>,
    ) => {
      const { runId, stepIndex, actionIndex } = action.payload;
      const run = state.runs.byId[runId];

      if (run && run.steps[stepIndex] && run.steps[stepIndex].actions[actionIndex]) {
        const actionRun = run.steps[stepIndex].actions[actionIndex];
        // Reset fields before starting
        actionRun.status = 'running';
        actionRun.startTime = new Date().toISOString();
        actionRun.endTime = null; // Reset end time
        actionRun.output = ''; // Reset output
        actionRun.error = null; // Reset error
        actionRun.duration = null; // Reset duration
        actionRun.streamingOutput = false;
      }
    },

    // Update action output (for streaming)
    updateActionOutput: (
      state,
      action: PayloadAction<{
        runId: string;
        stepIndex: number;
        actionIndex: number;
        output: string;
        append?: boolean;
      }>,
    ) => {
      const { runId, stepIndex, actionIndex, output, append = false } = action.payload;
      const run = state.runs.byId[runId];

      if (run && run.steps[stepIndex] && run.steps[stepIndex].actions[actionIndex]) {
        const actionRun = run.steps[stepIndex].actions[actionIndex];
        if (append) {
          actionRun.output += output;
        } else {
          actionRun.output = output;
        }
        actionRun.streamingOutput = true;
      }
    },

    // Complete execution of an action
    completeActionRun: (
      state,
      action: PayloadAction<{
        runId: string;
        stepIndex: number;
        actionIndex: number;
        output: string;
      }>,
    ) => {
      const { runId, stepIndex, actionIndex, output } = action.payload;
      const run = state.runs.byId[runId];

      if (run && run.steps[stepIndex] && run.steps[stepIndex].actions[actionIndex]) {
        const actionRun = run.steps[stepIndex].actions[actionIndex];
        actionRun.status = 'completed';
        actionRun.output = output;
        actionRun.endTime = new Date().toISOString();
        actionRun.streamingOutput = false;

        if (actionRun.startTime) {
          actionRun.duration =
            new Date(actionRun.endTime).getTime() - new Date(actionRun.startTime).getTime();
        }

        // Check if all actions in the step are completed
        const allActionsCompleted = run.steps[stepIndex].actions.every(
          (a) => a.status === 'completed' || a.status === 'failed',
        );

        // If all actions are completed, mark the step as completed
        if (allActionsCompleted) {
          run.steps[stepIndex].status = 'completed';
          run.steps[stepIndex].endTime = new Date().toISOString();

          if (run.steps[stepIndex].startTime) {
            run.steps[stepIndex].duration =
              new Date(run.steps[stepIndex].endTime).getTime() -
              new Date(run.steps[stepIndex].startTime).getTime();
          }
        }
      }
    },

    // Mark an action as failed
    failActionRun: (
      state,
      action: PayloadAction<{
        runId: string;
        stepIndex: number;
        actionIndex: number;
        error: string;
      }>,
    ) => {
      const { runId, stepIndex, actionIndex, error } = action.payload;
      const run = state.runs.byId[runId];

      if (run && run.steps[stepIndex] && run.steps[stepIndex].actions[actionIndex]) {
        const actionRun = run.steps[stepIndex].actions[actionIndex];
        actionRun.status = 'failed';
        actionRun.error = error;
        actionRun.endTime = new Date().toISOString();

        if (actionRun.startTime) {
          actionRun.duration =
            new Date(actionRun.endTime).getTime() - new Date(actionRun.startTime).getTime();
        }

        // Mark the step as failed if any action fails
        run.steps[stepIndex].status = 'failed';
        run.steps[stepIndex].endTime = new Date().toISOString();

        if (run.steps[stepIndex].startTime) {
          run.steps[stepIndex].duration =
            new Date(run.steps[stepIndex].endTime).getTime() -
            new Date(run.steps[stepIndex].startTime).getTime();
        }
      }
    },

    // Cancel a run
    cancelRun: (state, action: PayloadAction<string>) => {
      const runId = action.payload;
      const run = state.runs.byId[runId];

      if (run) {
        run.status = 'cancelled';
        run.endTime = new Date().toISOString();

        if (run.startTime) {
          run.duration = new Date(run.endTime).getTime() - new Date(run.startTime).getTime();
        }

        // Mark all running steps and actions as cancelled
        run.steps.forEach((step) => {
          if (step.status === 'running') {
            step.status = 'cancelled';
            step.endTime = new Date().toISOString();

            if (step.startTime) {
              step.duration = new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
            }
          }

          step.actions.forEach((action) => {
            if (action.status === 'running') {
              action.status = 'cancelled';
              action.endTime = new Date().toISOString();

              if (action.startTime) {
                action.duration =
                  new Date(action.endTime).getTime() - new Date(action.startTime).getTime();
              }
            }
          });
        });
      }
    },

    // Clear all runs
    clearRuns: (state) => {
      state.runs.byId = {};
      state.runs.allIds = [];
    },

    // Clear the state of a specific action run
    clearActionRun: (
      state,
      action: PayloadAction<{ runId: string; stepIndex: number; actionIndex: number }>,
    ) => {
      const { runId, stepIndex, actionIndex } = action.payload;
      const run = state.runs.byId[runId];

      if (run && run.steps[stepIndex] && run.steps[stepIndex].actions[actionIndex]) {
        const originalActionId = run.steps[stepIndex].actions[actionIndex].actionId;
        // Reset the action run state to default, preserving the original actionId link
        run.steps[stepIndex].actions[actionIndex] = {
          ...createDefaultActionRun(originalActionId),
          // Keep the same generated ID for the ActionRun container if needed,
          // or generate a new one if preferred. Let's keep it for simplicity.
          id: run.steps[stepIndex].actions[actionIndex].id,
        };
      }
    },
  },
});

// Extract action creators
export const {
  startRun,
  cloneRun,
  startStepRun,
  completeStepRun,
  startActionRun,
  updateActionOutput,
  completeActionRun,
  failActionRun,
  cancelRun,
  clearRuns,
  clearActionRun,
} = runsSlice.actions;

// Selectors
export const selectRunsById = (state: RootState) => state.runs.runs.byId;
export const selectRunIds = (state: RootState) => state.runs.runs.allIds;

// Select run by ID
export const selectRunById = createSelector(
  [selectRunsById, (_, runId: string) => runId],
  (byId, runId) => byId[runId] || null,
);

// Select runs for a specific flow
export const selectRunsByFlowId = createSelector(
  [selectRunsById, selectRunIds, (_, flowId: string) => flowId],
  (byId, allIds, flowId) =>
    allIds.map((id) => byId[id]).filter((run) => run && run.flowId === flowId),
);

// Select the latest run for a specific flow
export const selectLatestRunForFlow = createSelector([selectRunsByFlowId], (runs) =>
  runs.length > 0 ? runs[runs.length - 1] : null,
);

export default runsSlice.reducer;
