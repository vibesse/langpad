import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/app/store';

type Theme = 'dark' | 'light' | 'system';

interface AppState {
  theme: Theme;
  debugVisible: boolean;
}

// Load initial theme from localStorage or default to system
const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    const storedTheme = localStorage.getItem('langpad-theme');
    if (
      storedTheme &&
      (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')
    ) {
      return storedTheme as Theme;
    }
  }
  return 'system';
};

// Load initial debug visibility from localStorage or default to false
const getInitialDebugVisible = (): boolean => {
  if (typeof window !== 'undefined') {
    const storedDebugVisible = localStorage.getItem('langpad-debug-visible');
    return storedDebugVisible === 'true';
  }
  return false;
};

const initialState: AppState = {
  theme: getInitialTheme(),
  debugVisible: getInitialDebugVisible(),
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      // Also save to localStorage for persistence
      localStorage.setItem('langpad-theme', action.payload);
    },
    toggleDebugVisible: (state) => {
      state.debugVisible = !state.debugVisible;
      // Save to localStorage for persistence
      localStorage.setItem('langpad-debug-visible', state.debugVisible.toString());
    },
    setDebugVisible: (state, action: PayloadAction<boolean>) => {
      state.debugVisible = action.payload;
      // Save to localStorage for persistence
      localStorage.setItem('langpad-debug-visible', action.payload.toString());
    },
  },
});

export const { setTheme, toggleDebugVisible, setDebugVisible } = appSlice.actions;

export const selectTheme = (state: RootState) => state.app.theme;
export const selectDebugVisible = (state: RootState) => state.app.debugVisible;

export default appSlice.reducer;
