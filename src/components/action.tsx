import { shallowEqual } from 'react-redux';
import { Bot, ChevronDown, Minimize2, Play, Plus, Trash, User, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { Textarea } from './ui/textarea';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  updateAction,
  updateMessageRole,
  updateMessageContent,
  updateMessageFilesEnabled,
  updateMessageFiles,
  addMessageToAction,
  removeMessageFromAction,
  selectActionById,
  removeAction,
} from '@/features/actionsSlice';
import { removeActionFromStep } from '@/features/flowsSlice';
import { MultiSelect } from './multi-select';
import { selectOpenAiModels } from '@/features/providerSlice';
import { flowRunner } from '@/lib/flowRunner';
import { toast } from 'sonner';
import { selectStepsByFlowId } from '@/features/flowsSlice';
import { selectLatestRunForFlow } from '@/features/runsSlice';
import { selectVariables, Variable } from '@/features/variablesSlice'; // Use correct selector name
import { Step } from '@/features/flowsSlice'; // Import Step type

interface ActionProps {
  id: string;
  flowId: string;
  stepId: string;
}

const Action = ({ id, flowId, stepId }: ActionProps) => {
  const dispatch = useAppDispatch();
  const action = useAppSelector((state) => selectActionById(state, id));
  const files = useAppSelector((state) => state.files.files).filter((file) => !!file.content);
  const models = useAppSelector(selectOpenAiModels);
  const steps = useAppSelector((state) => selectStepsByFlowId(state, flowId));
  const variables: Variable[] = useAppSelector(selectVariables);
  // Select the latest run snapshot for this action, memoizing relevant properties
  const actionRun = useAppSelector((state) => {
    const stepsDef = selectStepsByFlowId(state, flowId);
    const run = selectLatestRunForFlow(state, flowId);
    if (!run) return null;
    const stepIndex = stepsDef.findIndex((s) => s.id === stepId);
    if (stepIndex === -1 || stepIndex >= run.steps.length) return null;
    const stepRun = run.steps[stepIndex];
    const actionIndex = stepsDef[stepIndex].actionIds.findIndex((aid) => aid === id);
    if (actionIndex === -1 || actionIndex >= stepRun.actions.length) return null;
    const ar = stepRun.actions[actionIndex];
    if (!ar || ar.actionId !== id) return null;
    // Return a plain object to allow shallowEqual to detect property changes
    return {
      output: ar.output,
      status: ar.status,
      duration: ar.duration,
      streamingOutput: ar.streamingOutput,
      error: ar.error,
    };
  }, shallowEqual);

  const supportedModels = models.filter((model) =>
    ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4.1', 'gpt-4.1-min'].includes(model.id),
  );

  if (!action) return null;

  // Calculate available variables
  const calculateAvailableVariables = () => {
    const storeVariables = variables.map((v: Variable) => `{{${v.name}}}`); // Add type to v
    const previousStepOutputVariables: string[] = [];
    const currentStepIndex = steps.findIndex((s: Step) => s.id === stepId); // Add type to s

    if (currentStepIndex > 0) {
      for (let i = 0; i < currentStepIndex; i++) {
        const prevStep = steps[i];
        prevStep.actionIds.forEach((_, actionIndex) => {
          // Assuming action naming convention based on index within the step
          previousStepOutputVariables.push(`{{$step${i + 1}.action${actionIndex + 1}.output}}`);
        });
      }
    }
    return [...storeVariables, ...previousStepOutputVariables];
  };

  const availableVariables = calculateAvailableVariables();

  const {
    selectedModel,
    temperature,
    systemPromptEnabled,
    systemPromptTextAreaVisible,
    systemPrompt,
    structuredOutputEnabled,
    structuredOutputTextAreaVisible,
    structuredOutput,
    messages,
    detailsCollapsed,
  } = action;

  const handleModelChange = (model: string) => {
    dispatch(updateAction({ id, changes: { selectedModel: model } }));
  };

  const handleTemperatureChange = (value: number) => {
    dispatch(updateAction({ id, changes: { temperature: value } }));
  };

  const handleSystemPromptChange = (value: string) => {
    dispatch(updateAction({ id, changes: { systemPrompt: value } }));
  };

  const handleSystemPromptEnabledChange = (checked: boolean) => {
    dispatch(updateAction({ id, changes: { systemPromptEnabled: checked } }));
  };

  const handleSystemPromptTextAreaVisibleChange = (visible: boolean) => {
    dispatch(updateAction({ id, changes: { systemPromptTextAreaVisible: visible } }));
  };

  const handleStructuredOutputChange = (value: string) => {
    dispatch(updateAction({ id, changes: { structuredOutput: value } }));
  };

  const handleStructuredOutputEnabledChange = (checked: boolean) => {
    dispatch(updateAction({ id, changes: { structuredOutputEnabled: checked } }));
  };

  const handleStructuredOutputTextAreaVisibleChange = (visible: boolean) => {
    dispatch(updateAction({ id, changes: { structuredOutputTextAreaVisible: visible } }));
  };

  const handleMessageAdd = () => {
    dispatch(addMessageToAction({ actionId: id }));
  };

  const handleMessageDelete = (messageId: string) => {
    dispatch(removeMessageFromAction({ actionId: id, messageId }));
  };

  // Specify a more precise type for the 'value' parameter
  const handleMessageChange = (
    index: number,
    field: string,
    value: string | boolean | string[], // More specific type than any
  ) => {
    const messageId = messages[index].id;

    if (field === 'role') {
      // Ensure value is assignable to 'user' | 'assistant'
      const roleValue = value as 'user' | 'assistant';
      if (roleValue === 'user' || roleValue === 'assistant') {
        dispatch(updateMessageRole({ actionId: id, messageId, role: roleValue }));
      }
    } else if (field === 'content') {
      dispatch(updateMessageContent({ actionId: id, messageId, content: value as string }));
    } else if (field === 'filesEnabled') {
      dispatch(
        updateMessageFilesEnabled({ actionId: id, messageId, filesEnabled: value as boolean }),
      );
    } else if (field === 'files') {
      dispatch(updateMessageFiles({ actionId: id, messageId, files: value as string[] }));
    }
  };

  const handleDeleteAction = () => {
    // Find indices before dispatching remove actions
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      console.error('Could not find step index for deletion cleanup');
      // Still attempt removal from slices
      dispatch(removeAction(id));
      dispatch(removeActionFromStep({ flowId, stepId, actionId: id }));
      return;
    }
    const actionIndex = steps[stepIndex].actionIds.findIndex((actionId) => actionId === id);
    if (actionIndex === -1) {
      console.error('Could not find action index for deletion cleanup');
      // Still attempt removal from slices
      dispatch(removeAction(id));
      dispatch(removeActionFromStep({ flowId, stepId, actionId: id }));
      return;
    }

    // Dispatch actions to remove from definitions
    dispatch(removeAction(id));
    dispatch(removeActionFromStep({ flowId, stepId, actionId: id }));

    // Note: no per-action run-id state or cleanup needed in component
  };

  // Add handler for toggling collapse state
  const handleToggleCollapse = () => {
    dispatch(updateAction({ id, changes: { detailsCollapsed: !detailsCollapsed } }));
  };

  const handleRunAction = () => {
    // Find the step index
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (stepIndex === -1) {
      toast.error('Could not find step index');
      return;
    }

    // Find the action index within the step
    const actionIndex = steps[stepIndex].actionIds.findIndex((actionId) => actionId === id);
    if (actionIndex === -1) {
      toast.error('Could not find action index');
      return;
    }

    toast.info(`Running action ${actionIndex + 1} in step ${stepIndex + 1}`);

    flowRunner.runAction(flowId, stepIndex, actionIndex).catch((error) => {
      toast.error(`Action execution error: ${error.message}`);
    });
  };

  // Use the selected actionRun for rendering output

  return (
    <div className="w-full px-4 py-2 bg-accent border-l-4 mt-4">
      <div className="text-accent-foreground text-xs">
        <div className="flex justify-between items-center">
          <div className="text-xs font-medium">LLM call</div>
          <div>
            <Button variant={'ghost'} size={'sm'} onClick={handleDeleteAction}>
              <Trash size={12} />
            </Button>
            <Button variant={'ghost'} size={'sm'} onClick={handleToggleCollapse}>
              {detailsCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </Button>
            <Button variant={'ghost'} size={'sm'} onClick={handleRunAction}>
              <Play size={12} />
            </Button>
          </div>
        </div>
        {!detailsCollapsed && (
          <>
            <div className="flex justify-between items-center py-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size={'sm'} className="text-xs">
                    <ChevronDown /> {selectedModel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {supportedModels.map((model) => (
                    <DropdownMenuItem key={model.id} onClick={() => handleModelChange(model.id)}>
                      {model.id}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="min-w-[160px] flex">
                <Slider
                  value={[temperature]}
                  min={0}
                  max={1}
                  step={0.1}
                  className="mr-3 slider"
                  onValueChange={(value) => handleTemperatureChange(value[0])}
                />
                <Input
                  type="number"
                  value={temperature}
                  onChange={(e) => handleTemperatureChange(Number(e.target.value))}
                  className="w-18 text-xs h-8 p-1"
                  step={0.1}
                />
              </div>
            </div>
            <div className="py-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`${id}-system-prompt-enabled`}
                  checked={systemPromptEnabled}
                  onCheckedChange={handleSystemPromptEnabledChange}
                />
                <label
                  htmlFor={`${id}-system-prompt-enabled`}
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  System prompt
                </label>
                {systemPromptEnabled && (
                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      handleSystemPromptTextAreaVisibleChange(!systemPromptTextAreaVisible)
                    }
                  >
                    {systemPromptTextAreaVisible ? 'Hide' : 'Show'}
                  </div>
                )}
              </div>

              {systemPromptEnabled && systemPromptTextAreaVisible && (
                <Textarea
                  placeholder="Enter your system prompt here..."
                  className="w-full"
                  value={systemPrompt}
                  onChange={(e) => handleSystemPromptChange(e.target.value)}
                />
              )}

              <div className="flex items-center space-x-2 mt-2">
                <Checkbox
                  id={`${id}-structured-output-enabled`}
                  checked={structuredOutputEnabled}
                  onCheckedChange={handleStructuredOutputEnabledChange}
                />
                <label
                  htmlFor={`${id}-structured-output-enabled`}
                  className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Structured output
                </label>
                {structuredOutputEnabled && (
                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      handleStructuredOutputTextAreaVisibleChange(!structuredOutputTextAreaVisible)
                    }
                  >
                    {structuredOutputTextAreaVisible ? 'Hide' : 'Show'}
                  </div>
                )}
              </div>
            </div>

            {structuredOutputEnabled && structuredOutputTextAreaVisible && (
              <Textarea
                placeholder="Enter your structured output here..."
                className="w-full"
                value={structuredOutput}
                onChange={(e) => handleStructuredOutputChange(e.target.value)}
              />
            )}
            <div className="pt-3">
              <hr />
            </div>
            <div>
              {messages.map((message, index) => (
                <div key={`${id}-message-${message.id}`}>
                  <div className="flex justify-between my-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild className="cursor-pointer">
                        <div className="flex justify-between items-center">
                          {message.role === 'assistant' && <Bot size={12} className="mr-1" />}
                          {message.role === 'user' && <User size={12} className="mr-1" />}
                          {message.role}
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onSelect={() => handleMessageChange(index, 'role', 'user')}
                        >
                          user
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => handleMessageChange(index, 'role', 'assistant')}
                        >
                          assistant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div>
                      {index !== 0 && (
                        <Button
                          variant={'ghost'}
                          size={'sm'}
                          className="ml-2"
                          onClick={() => handleMessageDelete(message.id)}
                        >
                          <Trash size={12} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Display available variables */}
                  {availableVariables.length > 0 && (
                    <div className="text-xs text-muted-foreground my-2">
                      <span className="font-medium">Available variables:</span>{' '}
                      {availableVariables.join(', ')}
                    </div>
                  )}

                  <Textarea
                    placeholder="Enter your message here..."
                    className="w-full"
                    value={message.content}
                    onChange={(e) => handleMessageChange(index, 'content', e.target.value)}
                  />

                  <div className="flex items-start justify-between py-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`${id}-message-files-enabled-${index}`}
                        checked={message.filesEnabled}
                        onCheckedChange={(checked) =>
                          handleMessageChange(index, 'filesEnabled', !!checked)
                        }
                      />
                      <label
                        htmlFor={`${id}-message-files-enabled-${index}`}
                        className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Files
                      </label>
                    </div>
                    {message.filesEnabled && (
                      <div className="min-w-[200px]">
                        <MultiSelect
                          options={files.map((file) => ({
                            label: file.name,
                            value: file.id,
                          }))}
                          onValueChange={(value) => {
                            handleMessageChange(index, 'files', value);
                          }}
                          value={message.files}
                          placeholder="Select files"
                          variant="inverted"
                          maxCount={3}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex items-start justify-end py-2">
                <Button
                  variant={'ghost'}
                  size={'sm'}
                  className="text-xs"
                  onClick={handleMessageAdd}
                >
                  <Plus /> Add message
                </Button>
              </div>
            </div>
            <div>
              <hr />
            </div>
          </>
        )}
        {/* Output section that displays results from the current run, if any */}
        <div className="py-4">
          {actionRun ? (
            <div>
              {/* Display status and duration */}
              <div className="text-xs text-muted-foreground mb-2 flex justify-between">
                <span>
                  Status:{' '}
                  <span
                    className={`font-medium ${
                      actionRun.status === 'running'
                        ? 'text-blue-600'
                        : actionRun.status === 'completed'
                          ? 'text-green-600'
                          : actionRun.status === 'failed'
                            ? 'text-red-600'
                            : actionRun.status === 'cancelled'
                              ? 'text-yellow-600'
                              : actionRun.status === 'idle'
                                ? 'text-gray-500'
                                : ''
                    }`}
                  >
                    {actionRun.status}
                  </span>
                </span>
                {actionRun.duration !== null && <span>Duration: {actionRun.duration}ms</span>}
              </div>
              {/* Display error if failed */}
              {actionRun.status === 'failed' && actionRun.error && (
                <div className="text-xs text-red-600 mb-2">Error: {actionRun.error}</div>
              )}
              {/* Output display */}
              <div
                className={`whitespace-pre-wrap text-sm border p-3 rounded-md ${
                  actionRun.streamingOutput
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : actionRun.status === 'completed'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : actionRun.status === 'failed'
                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                        : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {actionRun.output ||
                  (actionRun.status !== 'idle' && actionRun.status !== 'running'
                    ? 'No output.'
                    : '')}
                {actionRun.status === 'running' && !actionRun.output && 'Running...'}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-xs italic">
              Run this action or the flow/step to see output.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Action;
