import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';
import type { RootState } from '../app/store'; // Assuming store is in app directory

// Define the type for a single message within an action
export interface ActionMessage {
  id: string;
  filesEnabled: boolean;
  role: 'user' | 'assistant';
  content: string;
  files?: string[];
}

export interface Action {
  id: string;
  selectedModel?: string;
  temperature: number;
  systemPromptEnabled: boolean;
  systemPrompt: string;
  structuredOutputEnabled: boolean;
  structuredOutput: string;
  messages: ActionMessage[];
  systemPromptTextAreaVisible: boolean;
  structuredOutputTextAreaVisible: boolean;
  detailsCollapsed: boolean; // Add this line
}

interface ActionsState {
  actions: Action[];
}

const createDefaultMessage = (id?: string): ActionMessage => ({
  id: id || nanoid(),
  role: 'user',
  content: '',
  filesEnabled: false,
  files: [],
});

// Function to create a default action
const createDefaultAction = (id: string): Action => ({
  id,
  selectedModel: 'gpt-4o',
  temperature: 0.7,
  systemPromptEnabled: false,
  systemPrompt: '',
  structuredOutputEnabled: false,
  structuredOutput: '',
  messages: [createDefaultMessage()],
  systemPromptTextAreaVisible: true,
  structuredOutputTextAreaVisible: true,
  detailsCollapsed: false,
});

// Create the initial action
export const initialActionId = nanoid();
const initialAction = createDefaultAction(initialActionId);

// Set initial state with the default action
const initialState: ActionsState = {
  actions: [initialAction],
};

export const actionsSlice = createSlice({
  name: 'actions',
  initialState,
  reducers: {
    addAction: {
      prepare: () => {
        const actionId = nanoid();
        return { payload: actionId };
      },
      reducer: (state, action: PayloadAction<string>) => {
        // Use the createDefaultAction function here
        const newAction = createDefaultAction(action.payload);
        state.actions.push(newAction);
      },
    },
    _addActionInternal: (state, action: PayloadAction<Action>) => {
      // Ensure the action doesn't already exist (optional, but good practice)
      if (!state.actions.some((a) => a.id === action.payload.id)) {
        // Fixed: Added parentheses around 'a'
        state.actions.push(action.payload);
      }
    },
    removeAction: (state, action: PayloadAction<string>) => {
      state.actions = state.actions.filter((a) => a.id !== action.payload);
    },
    updateAction: (
      state,
      action: PayloadAction<{
        id: string;
        changes: Partial<Omit<Action, 'id' | 'messages'>>;
      }>,
    ) => {
      const index = state.actions.findIndex((a) => a.id === action.payload.id);
      if (index !== -1) {
        state.actions[index] = {
          ...state.actions[index],
          ...action.payload.changes,
        };
      }
    },
    addMessageToAction: (state, action: PayloadAction<{ actionId: string }>) => {
      const targetAction = state.actions.find((a) => a.id === action.payload.actionId);
      if (targetAction) {
        targetAction.messages.push(createDefaultMessage());
      }
    },
    removeMessageFromAction: (
      state,
      action: PayloadAction<{ actionId: string; messageId: string }>,
    ) => {
      const targetAction = state.actions.find((a) => a.id === action.payload.actionId);
      if (targetAction) {
        targetAction.messages = targetAction.messages.filter(
          (msg) => msg.id !== action.payload.messageId,
        );
      }
    },
    updateMessageInAction: (
      state,
      action: PayloadAction<{
        actionId: string;
        messageId: string;
        changes: Partial<Omit<ActionMessage, 'id'>>;
      }>,
    ) => {
      const targetAction = state.actions.find((a) => a.id === action.payload.actionId);
      if (targetAction) {
        const messageIndex = targetAction.messages.findIndex(
          (msg) => msg.id === action.payload.messageId,
        );
        if (messageIndex !== -1) {
          targetAction.messages[messageIndex] = {
            ...targetAction.messages[messageIndex],
            ...action.payload.changes,
          };
        }
      }
    },
    updateMessageRole: (
      state,
      action: PayloadAction<{
        actionId: string;
        messageId: string;
        role: 'user' | 'assistant';
      }>,
    ) => {
      const targetAction = state.actions.find((a) => a.id === action.payload.actionId);
      if (targetAction) {
        const message = targetAction.messages.find((msg) => msg.id === action.payload.messageId);
        if (message) {
          message.role = action.payload.role;
        }
      }
    },
    updateMessageContent: (
      state,
      action: PayloadAction<{
        actionId: string;
        messageId: string;
        content: string;
      }>,
    ) => {
      const targetAction = state.actions.find((a) => a.id === action.payload.actionId);
      if (targetAction) {
        const message = targetAction.messages.find((msg) => msg.id === action.payload.messageId);
        if (message) {
          message.content = action.payload.content;
        }
      }
    },
    updateMessageFilesEnabled: (
      state,
      action: PayloadAction<{
        actionId: string;
        messageId: string;
        filesEnabled: boolean;
      }>,
    ) => {
      const targetAction = state.actions.find((a) => a.id === action.payload.actionId);
      if (targetAction) {
        const message = targetAction.messages.find((msg) => msg.id === action.payload.messageId);
        if (message) {
          message.filesEnabled = action.payload.filesEnabled;
        }
      }
    },
    updateMessageFiles: (
      state,
      action: PayloadAction<{
        actionId: string;
        messageId: string;
        files: string[];
      }>,
    ) => {
      const targetAction = state.actions.find((a) => a.id === action.payload.actionId);
      if (targetAction) {
        const message = targetAction.messages.find((msg) => msg.id === action.payload.messageId);
        if (message) {
          message.files = action.payload.files;
        }
      }
    },
  },
});

export const {
  addAction,
  _addActionInternal,
  removeAction,
  updateAction,
  addMessageToAction,
  removeMessageFromAction,
  updateMessageInAction,
  updateMessageRole,
  updateMessageContent,
  updateMessageFilesEnabled,
  updateMessageFiles,
} = actionsSlice.actions;

export const selectAllActions = (state: RootState) => state.actions.actions;

export const selectActionById = (state: RootState, actionId: string) =>
  state.actions.actions.find((action) => action.id === actionId);

export default actionsSlice.reducer;

// Helper function for deep cloning an action with new IDs
export const cloneActionWithNewIds = (originalAction: Action): Action => {
  const newActionId = nanoid();
  const clonedMessages = originalAction.messages.map((msg) => ({
    // Fixed: Added parentheses around 'msg'
    ...msg,
    id: nanoid(), // Generate new ID for each message
    // Ensure files array is copied if it exists
    files: msg.files ? [...msg.files] : [],
  }));

  return {
    ...originalAction,
    id: newActionId, // Assign the new action ID
    messages: clonedMessages, // Assign the messages with new IDs
  };
};
