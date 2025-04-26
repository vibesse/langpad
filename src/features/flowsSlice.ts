import { createSlice, PayloadAction, nanoid, createSelector } from '@reduxjs/toolkit';
import type { RootState, AppThunk } from '../app/store'; // Import AppThunk
import {
  addAction,
  initialActionId,
  _addActionInternal, // Import the internal action adder
  cloneActionWithNewIds, // Import the cloning helper
  selectActionById, // Import selector to get action data
} from './actionsSlice';

// Define the structure for steps which will contain actions
export interface Step {
  id: string;
  name: string; // Optional name for the step
  actionIds: string[]; // References to actions in the actions slice
}

// Define the structure for a flow
export interface Flow {
  id: string;
  name: string;
  steps: Step[];
}

interface FlowsState {
  flows: {
    byId: Record<string, Flow>;
    allIds: string[];
  };
  activeFlowId: string | null;
}

// Helper to create a default step
const createDefaultStep = (id: string, initialActionIds: string[] = []): Step => ({
  id, // Use provided ID
  name: '',
  actionIds: initialActionIds,
});

// Create a default flow with one empty step - Modified to use the new createDefaultStep signature
const createDefaultFlow = (name: string): Flow => {
  // Use the initialActionId for the first step
  const initialStep = createDefaultStep(nanoid(), [initialActionId]);
  return {
    id: nanoid(),
    name,
    steps: [initialStep],
  };
};

// Create properly initialized default flow
const defaultFlow = createDefaultFlow('Main');

// Initial state with a default flow
const initialState: FlowsState = {
  flows: {
    byId: {
      [defaultFlow.id]: defaultFlow,
    },
    allIds: [defaultFlow.id],
  },
  activeFlowId: defaultFlow.id,
};

export const flowsSlice = createSlice({
  name: 'flows',
  initialState,
  reducers: {
    // Flow operations
    addFlow: (state, action: PayloadAction<string>) => {
      const newFlow = createDefaultFlow(action.payload);
      state.flows.byId[newFlow.id] = newFlow;
      state.flows.allIds.push(newFlow.id);
      // If no active flow, set this as active
      if (!state.activeFlowId) {
        state.activeFlowId = newFlow.id;
      }
    },
    removeFlow: (state, action: PayloadAction<string>) => {
      delete state.flows.byId[action.payload];
      state.flows.allIds = state.flows.allIds.filter((id) => id !== action.payload);
      // If removing the active flow, set active to the first flow or null
      if (state.activeFlowId === action.payload) {
        state.activeFlowId = state.flows.allIds.length > 0 ? state.flows.allIds[0] : null;
      }
    },
    updateFlowName: (state, action: PayloadAction<{ flowId: string; name: string }>) => {
      const flow = state.flows.byId[action.payload.flowId];
      if (flow) {
        flow.name = action.payload.name;
      }
    },
    setActiveFlow: (state, action: PayloadAction<string>) => {
      state.activeFlowId = action.payload;
    },

    // Internal reducer to add a step with pre-defined ID and action
    _addStepInternal: (
      state,
      action: PayloadAction<{ flowId: string; stepId: string; actionId: string }>,
    ) => {
      const { flowId, stepId, actionId } = action.payload;
      const flow = state.flows.byId[flowId];
      if (flow) {
        // Create the step using the provided IDs
        const newStep = createDefaultStep(stepId, [actionId]);
        flow.steps.push(newStep);
      }
    },
    removeStep: (state, action: PayloadAction<{ flowId: string; stepId: string }>) => {
      const flow = state.flows.byId[action.payload.flowId];
      if (flow) {
        flow.steps = flow.steps.filter((step) => step.id !== action.payload.stepId);
      }
    },
    updateStepName: (
      state,
      action: PayloadAction<{ flowId: string; stepId: string; name: string }>,
    ) => {
      const flow = state.flows.byId[action.payload.flowId];
      if (flow) {
        const step = flow.steps.find((s) => s.id === action.payload.stepId);
        if (step) {
          step.name = action.payload.name;
        }
      }
    },

    // Action-related operations within steps
    addActionToStep: (
      state,
      action: PayloadAction<{ flowId: string; stepId: string; actionId: string }>,
    ) => {
      const flow = state.flows.byId[action.payload.flowId];
      if (flow) {
        const step = flow.steps.find((s) => s.id === action.payload.stepId);
        if (step) {
          step.actionIds.push(action.payload.actionId);
        }
      }
    },
    removeActionFromStep: (
      state,
      action: PayloadAction<{ flowId: string; stepId: string; actionId: string }>,
    ) => {
      const flow = state.flows.byId[action.payload.flowId];
      if (flow) {
        const step = flow.steps.find((s) => s.id === action.payload.stepId);
        if (step) {
          step.actionIds = step.actionIds.filter((id) => id !== action.payload.actionId);
        }
      }
    },
    // Internal reducer to add a fully cloned flow (used by the thunk)
    _addClonedFlowInternal: (state, action: PayloadAction<Flow>) => {
      const newFlow = action.payload;
      state.flows.byId[newFlow.id] = newFlow;
      state.flows.allIds.push(newFlow.id);
      state.activeFlowId = newFlow.id; // Set the new clone as active
    },
  },
});

// Thunk action creator to add a step and an initial action
export const addStepWithAction =
  (flowId: string): AppThunk =>
  (dispatch) => {
    // 1. Dispatch addAction to create the action and get its ID
    const actionResult = dispatch(addAction());
    const actionId = actionResult.payload as string; // Assuming payload is the ID

    // 2. Generate a unique ID for the new step
    const stepId = nanoid();

    // 3. Dispatch the internal reducer to add the step with the action
    dispatch(_addStepInternal({ flowId, stepId, actionId }));
  };

// Thunk action creator for cloning a flow with deep action cloning
export const cloneFlow =
  (flowIdToClone: string): AppThunk =>
  (dispatch, getState) => {
    const state = getState();
    const flowToClone = state.flows.flows.byId[flowIdToClone];

    if (flowToClone) {
      const newFlowId = nanoid();
      const clonedSteps: Step[] = [];

      // Iterate through original steps
      for (const originalStep of flowToClone.steps) {
        const newStepId = nanoid();
        const newActionIds: string[] = [];

        // Iterate through original action IDs in the step
        for (const originalActionId of originalStep.actionIds) {
          const originalAction = selectActionById(state, originalActionId); // Get the full action object
          if (originalAction) {
            // Deep clone the action with new IDs
            const clonedAction = cloneActionWithNewIds(originalAction);
            // Dispatch internal action to add the cloned action to the actions state
            dispatch(_addActionInternal(clonedAction));
            // Store the new action ID
            newActionIds.push(clonedAction.id);
          } else {
            // Handle case where original action might not be found (optional logging/error)
            console.warn(`Original action with ID ${originalActionId} not found during clone.`);
            // Optionally, you might want to push the original ID or skip it
            // newActionIds.push(originalActionId); // If you want to keep the reference if not found
          }
        }

        // Create the new step with the new action IDs
        clonedSteps.push({
          id: newStepId,
          name: originalStep.name,
          actionIds: newActionIds, // Use the NEW action IDs
        });
      }

      // Create the fully cloned flow object
      const clonedFlow: Flow = {
        id: newFlowId,
        name: `${flowToClone.name}${flowToClone.name ? ' ' : ''}(copy)`,
        steps: clonedSteps,
      };

      // Dispatch internal reducer to add the cloned flow to the flows state
      dispatch(_addClonedFlowInternal(clonedFlow));
    }
  };

// Extract and export actions
export const {
  addFlow,
  // cloneFlow, // Removed direct reducer export, use the thunk instead
  removeFlow,
  updateFlowName,
  setActiveFlow,
  _addClonedFlowInternal, // Export internal flow adder
  _addStepInternal, // Export internal for completeness, though shouldn't be used directly
  removeStep,
  updateStepName,
  addActionToStep,
  removeActionFromStep,
} = flowsSlice.actions;

export const selectFlowsById = (state: RootState) => state.flows.flows.byId;
export const selectFlowIds = (state: RootState) => state.flows.flows.allIds;
export const selectActiveFlowId = (state: RootState) => state.flows.activeFlowId;

export const selectAllFlows = createSelector([selectFlowsById, selectFlowIds], (byId, allIds) =>
  allIds.map((id) => byId[id]),
);

export const selectFlowById = createSelector(
  [selectFlowsById, (_, flowId: string) => flowId],
  (byId, flowId) => byId[flowId] || null,
);

// Select the active flow
export const selectActiveFlow = createSelector(
  [selectFlowsById, selectActiveFlowId, selectFlowIds],
  (byId, activeFlowId, allIds) => {
    // If there's an active flow, return that
    if (activeFlowId && byId[activeFlowId]) {
      return byId[activeFlowId];
    }
    // If no active flow or the active flow not found, return the first flow or null
    return allIds.length > 0 ? byId[allIds[0]] : null;
  },
);

// Select steps by flow id
export const selectStepsByFlowId = createSelector(
  [selectFlowsById, (_, flowId: string) => flowId],
  (byId, flowId) => {
    const flow = byId[flowId];
    return flow ? flow.steps : [];
  },
);

export default flowsSlice.reducer;
