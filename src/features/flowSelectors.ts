import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../app/store';
import {
  selectAllActions,
  Action as ActionState,
  ActionMessage as ActionMessageState,
} from './actionsSlice';
import { Variable } from './variablesSlice';
import { File as FileState } from './filesSlice';
import { selectFlowsById } from './flowsSlice'; // Import base selector

// --- SELECTORS from other slices needed here ---
const selectVariables = (state: RootState) => state.variables.variables;
const selectFiles = (state: RootState) => state.files.files;

// --- TYPE DEFINITIONS for Output Structure ---

// Define the output structure for messages
interface OutputMessageContent {
  type: 'text' | 'file' | 'image_url';
  text?: string;
  file?: {
    file_data: string; // base64 content or placeholder,
    filename?: string; // optional filename
  };
  image_url?: {
    url: string;
  };
}

interface OutputMessage {
  role: 'user' | 'assistant' | 'system';
  content: OutputMessageContent[];
}

// Define the output structure for actions
interface OutputAction {
  model: string;
  temperature: number;
  messages: OutputMessage[];
  structured_output?: string;
}

// Define the output structure for steps
interface OutputStep {
  actions: OutputAction[];
}

// Define the final output structure for the flow
interface OutputFlow {
  steps: OutputStep[];
}

// Helper function to replace variables in a string
const replaceVariables = (text: string, variables: Variable[]): string => {
  let result = text;
  variables.forEach((variable) => {
    // Match {{ $var }} or { $var } with optional whitespace
    // Escape curly braces and the dollar sign for the RegExp constructor
    const regex = new RegExp(
      `\\{{\\s*\\$${variable.name.substring(1)}\\s*\\}\\}|\\{\\s*\\$${variable.name.substring(1)}\\s*\\}`,
      'g',
    );
    result = result.replace(regex, variable.value);
  });
  return result;
};

// --- MAIN SELECTORS ---

export const selectFlowForExecution = createSelector(
  [
    selectFlowsById, // Use imported selector
    selectAllActions,
    selectVariables,
    selectFiles,
    (_, flowId: string) => flowId,
    (_, __, replaceVarsAndFiles: boolean = false) => replaceVarsAndFiles,
  ],
  (flowsById, allActions, variables, files, flowId, replaceVarsAndFiles): OutputFlow | null => {
    const flow = flowsById[flowId];
    if (!flow) {
      return null;
    }

    const filesMap = files.reduce(
      (acc, f) => {
        acc[f.id] = f;
        return acc;
      },
      {} as Record<string, FileState>,
    );

    const outputFlow: OutputFlow = {
      steps: flow.steps.map((step): OutputStep => {
        const outputActions: OutputAction[] = step.actionIds
          .map((actionId) => allActions.find((a) => a.id === actionId))
          .filter((action): action is ActionState => !!action)
          .map((action): OutputAction => {
            const messages: OutputMessage[] = [];

            // Add system prompt if enabled and present
            if (action.systemPromptEnabled && action.systemPrompt) {
              const systemContent = replaceVarsAndFiles
                ? replaceVariables(action.systemPrompt, variables)
                : action.systemPrompt;
              messages.push({
                role: 'system',
                content: [{ type: 'text', text: systemContent }],
              });
            }

            // Process regular messages
            action.messages.forEach((msg: ActionMessageState) => {
              const messageContent: OutputMessageContent[] = [];
              const currentText = replaceVarsAndFiles
                ? replaceVariables(msg.content, variables)
                : msg.content;

              // Add text content
              if (currentText) {
                messageContent.push({ type: 'text', text: currentText });
              }

              // Add file content if enabled and files exist
              if (msg.filesEnabled && msg.files && msg.files.length > 0) {
                msg.files.forEach((fileId) => {
                  const file = filesMap[fileId];
                  if (file) {
                    const fileData = replaceVarsAndFiles ? file.content : `file_id:${file.id}`;
                    // Check if the file is an image
                    if (file.type.startsWith('image/')) {
                      messageContent.push({
                        type: 'image_url',
                        image_url: {
                          url: fileData,
                        },
                      });
                    } else {
                      // Keep original structure for non-image files
                      messageContent.push({
                        type: 'file',
                        file: {
                          file_data: fileData,
                          filename: file.name,
                        },
                      });
                    }
                  }
                });
              }
              if (messageContent.length > 0) {
                messages.push({ content: messageContent, role: msg.role });
              }
            });

            const outputAction: OutputAction = {
              model: action.selectedModel || 'unknown',
              temperature: action.temperature,
              messages: messages,
            };

            // Add structured output if enabled
            if (action.structuredOutputEnabled && action.structuredOutput) {
              outputAction.structured_output = replaceVarsAndFiles
                ? replaceVariables(action.structuredOutput, variables)
                : action.structuredOutput;
            }

            return outputAction;
          });

        return { actions: outputActions };
      }),
    };

    return outputFlow;
  },
);

// Selector variation that stringifies the output and shortens file data
export const selectFlowForExecutionAsString = createSelector(
  [selectFlowForExecution],
  (flowData): string | null => {
    if (!flowData) {
      return null;
    }

    const clonedFlowData = JSON.parse(JSON.stringify(flowData));

    const replaceFileData = (obj: any) => {
      if (obj && typeof obj === 'object') {
        if (Array.isArray(obj)) {
          obj.forEach(replaceFileData);
        } else {
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              const value = obj[key];
              if (
                key === 'file' &&
                value &&
                typeof value === 'object' &&
                'file_data' in value &&
                typeof value.file_data === 'string' &&
                value.file_data.startsWith('data:')
              ) {
                value.file_data = 'base64,...';
              } else if (
                key === 'file_data' &&
                typeof value === 'string' &&
                value.startsWith('data:')
              ) {
                // This case might be redundant if file_data is always within a 'file' object
                // but kept for safety if the structure can vary.
                obj[key] = 'base64,...';
              } else if (
                key === 'image_url' &&
                value &&
                typeof value === 'object' &&
                'url' in value &&
                typeof value.url === 'string' &&
                value.url.startsWith('data:')
              ) {
                value.url = 'base64,...'; // Replace image_url data
              } else if (typeof value === 'object') {
                replaceFileData(value); // Recurse only for objects/arrays
              }
            }
          }
        }
      }
    };

    replaceFileData(clonedFlowData);

    return JSON.stringify(clonedFlowData, null, 2);
  },
);
