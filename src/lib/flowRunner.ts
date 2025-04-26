import { store } from '@/app/store';
import { createChatCompletion } from './openai';
import { addLog } from '@/features/logsSlice';
import {
  startRun,
  startStepRun,
  completeStepRun,
  startActionRun,
  updateActionOutput,
  completeActionRun,
  failActionRun,
  cancelRun,
  cloneRun,
  selectLatestRunForFlow,
} from '@/features/runsSlice';
import { selectFlowForExecution } from '@/features/flowSelectors';
import { Variable } from '@/features/variablesSlice';
import { Run } from '@/features/runsSlice';

// Helper to generate a unique ID for logs
const generateLogId = () => `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Helper function to replace both store variables and step outputs
const replaceAllVariables = (
  text: string,
  variables: Variable[],
  runState: Run | null,
  currentStepIndex: number,
): string => {
  if (!text) return '';

  let result = text;

  // 1. Replace store variables ({{$var.name}})
  variables.forEach((variable) => {
    const regex = new RegExp(
      // Match {{ $var.name }} or { $var.name } - Adjusted to match the actual variable name format
      `\\{{\\s*\\$var\\.${variable.name.replace(
        /[$()*+.?[\\\]^{|}-]/g,
        '\\$&',
      )}\\s*\\}\\}|\\{\\s*\\$var\\.${variable.name.replace(/[$()*+.?[\\\]^{|}-]/g, '\\$&')}\\s*\\}`,
      'g',
    );
    result = result.replace(regex, variable.value || ''); // Use empty string if value is null/undefined
  });

  // 2. Replace step/action outputs ({{$step<N>.action<M>.output}})
  if (runState) {
    const stepOutputRegex = /{{\s*\$step(\d+)\.action(\d+)\.output\s*}}/g;
    result = result.replace(stepOutputRegex, (match, stepNumStr, actionNumStr) => {
      const stepNum = parseInt(stepNumStr, 10);
      const actionNum = parseInt(actionNumStr, 10);
      const referencedStepIndex = stepNum - 1;
      const referencedActionIndex = actionNum - 1;

      // Ensure the reference is to a previous step
      if (
        referencedStepIndex >= 0 &&
        referencedStepIndex < currentStepIndex &&
        runState.steps[referencedStepIndex] &&
        runState.steps[referencedStepIndex].actions[referencedActionIndex]
      ) {
        return runState.steps[referencedStepIndex].actions[referencedActionIndex].output || '';
      }

      // If reference is invalid or not found, replace with empty string or keep placeholder?
      // Let's replace with empty string for now.
      console.warn(`Invalid variable reference: ${match}`);
      return '';
    });
  }

  return result;
};

/**
 * Flow Runner service to execute flows, steps, and actions
 * This is a stateless service, so multiple flows can be executed concurrently
 */
export class FlowRunner {
  /**
   * Run a flow from start to finish
   * @param flowId The ID of the flow to run
   * @returns The created runId
   */
  public static async runFlow(flowId: string): Promise<string> {
    try {
      // Initialize the run in the Redux store
      let state = store.getState();
      const flowData = selectFlowForExecution(state, flowId, true);

      if (!flowData) {
        this.log('error', null, `Failed to run flow: Flow ${flowId} not found`);
        throw new Error(`Flow ${flowId} not found`);
      }

      // Log the start of the flow
      this.log('info', null, `Starting flow execution for flow: ${flowId}`);

      // Initialize the run in the Redux store
      const steps = state.flows.flows.byId[flowId]?.steps || [];
      const stepsWithActionIds = steps.map((step) => ({
        id: step.id,
        actionIds: step.actionIds,
      }));

      // Dispatch startRun to create the new run
      const startRunAction = startRun({ flowId, steps: stepsWithActionIds });
      store.dispatch(startRunAction);

      // Get the runId from the action payload
      const runId = startRunAction.payload.runId;

      if (!runId) {
        this.log('error', null, 'Failed to create run for flow execution');
        throw new Error('Failed to create run for flow execution');
      }

      // Execute steps sequentially
      for (let i = 0; i < flowData.steps.length; i++) {
        // Check if the run has been canceled
        const currentRun = store.getState().runs.runs.byId[runId];
        if (!currentRun || currentRun.status === 'cancelled') {
          this.log('info', runId, `Flow execution was canceled`);
          return runId;
        }

        // Start step execution
        store.dispatch(startStepRun({ runId, stepIndex: i }));
        this.log('info', runId, `Executing step ${i + 1}`);

        const step = flowData.steps[i];
        const stepStartTime = Date.now();

        // Execute actions in this step in parallel
        const actionPromises = step.actions.map((action, j) =>
          this.executeAction(runId, i, j, action),
        );

        try {
          await Promise.all(actionPromises);
          const stepDuration = Date.now() - stepStartTime;
          this.log('info', runId, `Completed step ${i + 1} in ${stepDuration}ms`);

          // Complete step
          store.dispatch(completeStepRun({ runId, stepIndex: i }));
        } catch (error) {
          this.log(
            'error',
            runId,
            `Error in step ${i + 1}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // The specific action that failed will have been marked as failed by executeAction
        }
      }

      this.log('info', runId, `Flow execution completed for flow: ${flowId}`);
      return runId;
    } catch (error) {
      this.log(
        'error',
        null,
        `Flow execution error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Run a specific step in the flow
   * @param flowId The ID of the flow
   * @param stepIndex The index of the step to run
   * @returns The ID of the run created or used
   */
  public static async runStep(flowId: string, stepIndex: number): Promise<string> {
    try {
      let state = store.getState();
      const flowData = selectFlowForExecution(state, flowId, true);

      if (!flowData || !flowData.steps[stepIndex]) {
        this.log(
          'error',
          null,
          `Failed to run step: Step ${stepIndex} in flow ${flowId} not found`,
        );
        throw new Error(`Step ${stepIndex} in flow ${flowId} not found`);
      }

      // Log the start of the step execution
      this.log('info', null, `Starting execution for step ${stepIndex + 1} in flow: ${flowId}`);

      // Determine runId: clone latest run or create a new one
      let runId: string;
      const latestRun = selectLatestRunForFlow(store.getState(), flowId);
      if (latestRun) {
        // Clone existing run snapshot when targeting an existing step
        const cloneRunAction = cloneRun({ oldRunId: latestRun.id, stepIndex });
        store.dispatch(cloneRunAction);
        runId = cloneRunAction.payload.newRunId;
      } else {
        // Fresh run: new step not in previous snapshot or no run exists
        const steps = state.flows.flows.byId[flowId]?.steps || [];
        const stepsWithActionIds = steps.map((step) => ({
          id: step.id,
          actionIds: step.actionIds,
        }));
        const startRunAction = startRun({ flowId, steps: stepsWithActionIds });
        store.dispatch(startRunAction);
        runId = startRunAction.payload.runId;
        if (!runId) {
          this.log('error', null, 'Failed to create run for step execution');
          throw new Error('Failed to create run for step execution');
        }
      }

      // Start step execution
      store.dispatch(startStepRun({ runId, stepIndex }));

      const step = flowData.steps[stepIndex];
      const stepStartTime = Date.now();

      // Execute actions in this step in parallel
      const actionPromises = step.actions.map((action, j) =>
        this.executeAction(runId, stepIndex, j, action),
      );

      try {
        await Promise.all(actionPromises);
        const stepDuration = Date.now() - stepStartTime;
        this.log('info', runId, `Completed step ${stepIndex + 1} in ${stepDuration}ms`);

        // Complete step
        store.dispatch(completeStepRun({ runId, stepIndex }));
        return runId;
      } catch (error) {
        this.log(
          'error',
          runId,
          `Error in step ${stepIndex + 1}: ${error instanceof Error ? error.message : String(error)}`,
        );
        // The specific action that failed will have been marked as failed by executeAction
        return runId;
      }
    } catch (error) {
      this.log(
        'error',
        null,
        `Step execution error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Run a specific action within a step
   * @param flowId The ID of the flow
   * @param stepIndex The index of the step
   * @param actionIndex The index of the action
   * @returns The ID of the run created or used
   */
  public static async runAction(
    flowId: string,
    stepIndex: number,
    actionIndex: number,
  ): Promise<string> {
    try {
      let state = store.getState();
      const flowData = selectFlowForExecution(state, flowId, true);

      if (
        !flowData ||
        !flowData.steps[stepIndex] ||
        !flowData.steps[stepIndex].actions[actionIndex]
      ) {
        this.log(
          'error',
          null,
          `Failed to run action: Action ${actionIndex} in step ${stepIndex} in flow ${flowId} not found`,
        );
        throw new Error(`Action ${actionIndex} in step ${stepIndex} in flow ${flowId} not found`);
      }

      // Determine runId: clone latest run or create a new one
      let runId: string;
      const latestRun = selectLatestRunForFlow(store.getState(), flowId);
      if (latestRun) {
        // Clone existing run snapshot when targeting an existing action
        const cloneRunAction = cloneRun({ oldRunId: latestRun.id, stepIndex, actionIndex });
        store.dispatch(cloneRunAction);
        runId = cloneRunAction.payload.newRunId;
      } else {
        // Fresh run: new step/action not in previous snapshot or no run exists
        const steps = state.flows.flows.byId[flowId]?.steps || [];
        const stepsWithActionIds = steps.map((step) => ({
          id: step.id,
          actionIds: step.actionIds,
        }));
        const startRunAction = startRun({ flowId, steps: stepsWithActionIds });
        store.dispatch(startRunAction);
        runId = startRunAction.payload.runId;
        if (!runId) {
          this.log('error', null, 'Failed to create run for action execution');
          throw new Error('Failed to create run for action execution');
        }
      }

      const action = flowData.steps[stepIndex].actions[actionIndex];
      await this.executeAction(runId, stepIndex, actionIndex, action);
      return runId;
    } catch (error) {
      this.log(
        'error',
        null,
        `Action execution error: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Cancel a run execution
   * @param runId The ID of the run to cancel
   */
  public static cancelExecution(runId: string): void {
    store.dispatch(cancelRun(runId));
    this.log('info', runId, 'Flow execution canceled');
  }

  /**
   * Execute a single action
   * @param runId The ID of the run
   * @param stepIndex The index of the step containing the action
   * @param actionIndex The index of the action within the step
   * @param action The action to execute
   */
  private static async executeAction(
    runId: string,
    stepIndex: number,
    actionIndex: number,
    action: any,
  ): Promise<void> {
    try {
      // Get current state to access variables and run state
      const state = store.getState();
      const variables = state.variables.variables; // Get store variables
      const runState = state.runs.runs.byId[runId]; // Get current run state

      // Start action execution
      store.dispatch(startActionRun({ runId, stepIndex, actionIndex }));
      this.log('info', runId, `Executing action ${actionIndex + 1} in step ${stepIndex + 1}`);

      // Prepare the messages for the OpenAI API, replacing variables
      const openaiMessages = action.messages.map((msg: any) => ({
        role: msg.role,
        // Replace variables in message content
        content: msg.content.map((contentItem: any) => {
          if (contentItem.type === 'text' && contentItem.text) {
            return {
              ...contentItem,
              text: replaceAllVariables(contentItem.text, variables, runState, stepIndex),
            };
          }
          // Potentially handle variable replacement in file names or image URLs if needed later
          return contentItem;
        }),
      }));
      /*
      // Prepare structured output, replacing variables
      let processedStructuredOutput: string | undefined = undefined;
      if (action.structured_output) {
        processedStructuredOutput = replaceAllVariables(
          action.structured_output,
          variables,
          runState,
          stepIndex,
        );
        // TODO: Decide if structured output needs to be passed to the API
        // Currently, it seems like it's a definition for expected output, not input.
        // If it *is* input, it needs to be added to openaiMessages or handled differently.
      }*/

      // Execute the action with OpenAI API
      const startTime = Date.now();
      const result = await createChatCompletion(
        {
          model: action.model,
          messages: openaiMessages, // Use processed messages
          temperature: action.temperature || 0.7,
          stream: true,
          // Add structured output handling here if required by the API
        },
        // Callback for streaming chunks
        (chunk) => {
          // DEBUG: Log payload before dispatching updateActionOutput
          console.log('[flowRunner] Dispatching updateActionOutput:', {
            runId,
            stepIndex,
            actionIndex,
            output: chunk,
            append: true,
          });

          // Update the action output with the streaming chunk
          store.dispatch(
            updateActionOutput({
              runId,
              stepIndex,
              actionIndex,
              output: chunk,
              append: true,
            }),
          );

          // Also add to log with streaming
          this.log(
            'info',
            runId,
            `[Step ${stepIndex + 1}, Action ${actionIndex + 1}] Stream: ${chunk}`,
            true,
          );
        },
      );

      const duration = Date.now() - startTime;
      this.log(
        'info',
        runId,
        `Completed action ${actionIndex + 1} in step ${stepIndex + 1} in ${duration}ms`,
      );

      // Complete the action with the full result
      store.dispatch(
        completeActionRun({
          runId,
          stepIndex,
          actionIndex,
          output: result.content,
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(
        'error',
        runId,
        `Error in action ${actionIndex + 1} in step ${stepIndex + 1}: ${errorMessage}`,
      );

      // Mark the action as failed
      store.dispatch(
        failActionRun({
          runId,
          stepIndex,
          actionIndex,
          error: errorMessage,
        }),
      );

      throw error; // Re-throw to propagate the error
    }
  }

  /**
   * Log a message to the Redux store
   * @param level The log level
   * @param runId The ID of the run associated with this log entry (can be null)
   * @param message The message to log
   * @param isStreamingUpdate Whether this is a streaming update to an existing log
   */
  private static log(
    level: 'info' | 'error' | 'warn' | 'debug',
    runId: string | null,
    message: string,
  ): void {
    const timestamp = new Date().toISOString();
    const logContent = runId ? `[Run: ${runId}] ${message}` : message;

    store.dispatch(
      addLog({
        // @ts-expect-error id for future
        id: generateLogId(),
        timestamp,
        level,
        content: logContent,
      }),
    );
  }
}

// Export the FlowRunner class directly
export const flowRunner = FlowRunner;
