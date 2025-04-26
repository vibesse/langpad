# Flow Runner Documentation

The `FlowRunner` class (`src/lib/flowRunner.ts`) is responsible for orchestrating the execution of flows, steps within flows, and actions within steps. It interacts heavily with the Redux store to manage the state of the execution process and log events.

## How it Works

The `FlowRunner` provides methods to run an entire flow, a specific step, or a single action.

1.  **`runFlow(flowId)`**:

    - Retrieves the complete flow data (steps and actions) using the `selectFlowForExecution` selector.
    - Dispatches `startRun` to initialize the run state in the `runsSlice`.
    - Iterates through each step in the flow.
    - For each step:
      - Dispatches `startStepRun`.
      - Executes all actions within the step _in parallel_ using `executeAction`.
      - Waits for all actions in the step to complete (or fail).
      - Dispatches `completeStepRun`.
    - Logs information and errors using the internal `log` method.
    - Handles cancellation via the `cancelExecution` method. If cancelled, it dispatches `cancelRun`.

2.  **`runStep(flowId, stepIndex)`**:

    - Similar to `runFlow`, but targets a specific step.
    - Retrieves flow data.
    - Initializes the run state via `startRun` if no active run exists for the runner instance.
    - Dispatches `startStepRun`.
    - Executes all actions within the specified step in parallel.
    - Dispatches `completeStepRun` upon completion.

3.  **`runAction(flowId, stepIndex, actionIndex)`**:

    - Targets a single action for execution.
    - Retrieves flow data.
    - Initializes the run state via `startRun` if necessary.
    - Calls `executeAction` for the specified action.

4.  **`executeAction(stepIndex, actionIndex, action)`**:

    - This private method handles the execution of a single action.
    - Dispatches `startActionRun`.
    - Prepares messages for the AI model (currently uses `createChatCompletion` from `openai.ts`).
    - Calls the AI model API (e.g., OpenAI).
    - If streaming is enabled:
      - Dispatches `updateActionOutput` for each received chunk, appending the output and marking it as streaming.
      - Logs streaming updates.
    - Upon completion of the API call:
      - Dispatches `completeActionRun` with the final output and duration.
    - If an error occurs:
      - Dispatches `failActionRun` with the error message.
      - Logs the error.
      - Re-throws the error to potentially stop parallel step execution.

5.  **`cancelExecution()`**:

    - Sets an internal `canceled` flag.
    - If a run is active (`runId` is set), dispatches `cancelRun`.
    - Logs the cancellation.

6.  **`log(level, message, isStreamingUpdate)`**:
    - A private helper to dispatch log messages.
    - Dispatches the `addLog` action to the `logsSlice`.
    - Handles streaming updates by potentially modifying the last log entry (though the current implementation always adds a new log entry).

## Redux State Dependencies and Updates

The `FlowRunner` relies on and modifies several parts of the Redux state:

**Dependencies (Reading State):**

- **`flowsSlice`**: Reads flow definitions (steps, action IDs) to know what to execute. Specifically uses `state.flows.flows.byId[flowId]`.
- **`actionsSlice`**: Reads action details (model, temperature, prompts, messages) via the `selectFlowForExecution` selector, which internally likely uses selectors tied to `actionsSlice`.
- **`filesSlice`**: (Implicitly via `selectFlowForExecution` if actions need file content, although direct usage isn't shown in `flowRunner.ts` itself, the preparation within `selectFlowForExecution` might use it).
- **`providerSlice`**: (Implicitly via `selectFlowForExecution` if actions need provider details like API keys, although direct usage isn't shown).

**Updates (Dispatching Actions):**

- **`runsSlice`**: This is the primary slice updated by the `FlowRunner` to track execution progress. It stores the state of each execution run.
  - `startRun`: Initializes a new run record when a flow, step, or action execution begins and no run is active for the `FlowRunner` instance. This record includes the `flowId` and the structure of steps and their associated `actionIds`, linking the run state back to the original flow definition.
  - `startStepRun`: Marks a specific step (identified by its index within the run) as 'running'.
  - `completeStepRun`: Marks a step as 'completed'.
  - `startActionRun`: Marks a specific action (identified by step index and action index within the run) as 'running'.
  - `updateActionOutput`: Updates the `output` field of a specific action's state within the run. This is used for streaming results and sets a `streamingOutput` flag.
  - `completeActionRun`: Marks an action as 'completed', storing the final `output` and execution `duration`. Clears the `streamingOutput` flag.
  - `failActionRun`: Marks an action as 'failed', storing the `error` message.
  - `cancelRun`: Marks the entire run as 'canceled'.
- **`logsSlice`**:
  - `addLog`: Adds informational or error messages generated during the execution process to the logs.

## Storing Results and State Linking

Execution results (status, output, errors, duration) are stored within the `runsSlice` of the Redux state.

- A top-level `run` object is created for each execution initiated by a `FlowRunner` instance (identified by a unique `runId`).
- This `run` object contains the `flowId`, linking it back to the specific flow definition in `flowsSlice`.
- Inside the `run` object, there's typically an array or map representing the state of each `step` within that run. The initial structure mirrors the flow's steps, including original `stepId`s and `actionId`s.
- Each `step` state object tracks its status ('pending', 'running', 'completed', 'failed').
- Inside each `step` state object, there's an array or map for the state of each `action` within that step for that specific run.
- Each `action` state object tracks its status, stores the resulting `output` (updated progressively during streaming), potential `error` messages, and execution `duration`. These action states are linked back to the original action definitions (in `actionsSlice`) via the `actionId` stored during the `startRun` initialization.

Updates during the run (`startStepRun`, `startActionRun`, etc.) use the `runId` and indices (`stepIndex`, `actionIndex`) to locate and modify the correct part of the state tree within that specific run instance in `runsSlice`.

## Re-running Actions/Steps

When an action or step is re-run using the `runAction` or `runStep` methods on an _existing_ `FlowRunner` instance that already has an active `runId`:

- **It updates the state within the _current_ run.** It does _not_ create a new top-level run entry in the `runsSlice`.
- The specific action or actions within the step will transition back through the 'running' state, and their `output`, `status`, and `error` fields in the existing run record will be overwritten with the results of the re-execution.

If the intention is to start a completely fresh run (e.g., user clicks a "Run Flow" button again), a new `FlowRunner` instance should typically be used, or the `runId` on the existing instance should be cleared before initiating the run, which would then trigger `startRun` to create a new, separate run record in the `runsSlice`.

## Key Interactions

- **Flow Data Selection**: Uses `selectFlowForExecution` (from `features/flowSelectors.ts`) to gather all necessary data (flow structure, step details, action configurations) before execution. This selector likely combines data from `flowsSlice` and `actionsSlice`.
- **AI Interaction**: Uses `createChatCompletion` (from `lib/openai.ts`) to interact with the AI model. It passes action parameters (model, messages, temperature) and handles streaming responses via a callback.
- **State Management**: Relies entirely on Redux for managing the state of the execution (what's running, what failed, outputs) and for logging. It dispatches actions defined in `runsSlice` and `logsSlice`.
