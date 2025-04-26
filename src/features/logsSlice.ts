import { createSlice, PayloadAction, nanoid } from '@reduxjs/toolkit';
import { RootState } from '../app/store';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string format
  level: LogLevel;
  content: string;
}

interface LogsState {
  entries: LogEntry[];
}

const initialState: LogsState = {
  entries: [],
};

const logsSlice = createSlice({
  name: 'logs',
  initialState,
  reducers: {
    addLog: {
      reducer: (state, action: PayloadAction<LogEntry>) => {
        state.entries.push(action.payload);
      },
      prepare: (payload: { content: string; level?: LogLevel }) => {
        const { content, level = 'info' } = payload;
        return {
          payload: {
            id: nanoid(),
            timestamp: new Date().toISOString(),
            level,
            content,
          },
        };
      },
    },
    appendLogContent: (state, action: PayloadAction<{ id: string; content: string }>) => {
      const log = state.entries.find((entry) => entry.id === action.payload.id);
      if (log) {
        log.content += action.payload.content;
      }
    },
    updateLog: (state, action: PayloadAction<Partial<LogEntry> & { id: string }>) => {
      const index = state.entries.findIndex((entry) => entry.id === action.payload.id);
      if (index !== -1) {
        state.entries[index] = { ...state.entries[index], ...action.payload };
      }
    },
    removeLog: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter((entry) => entry.id !== action.payload);
    },
    clearLogs: (state) => {
      state.entries = [];
    },
  },
});

export const { addLog, appendLogContent, updateLog, removeLog, clearLogs } = logsSlice.actions;

export const selectLogs = (state: RootState) => state.logs.entries;

export default logsSlice.reducer;
