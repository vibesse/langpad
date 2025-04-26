import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '@/app/store';
import { validateOpenAiKey } from '@/lib/openai';
import { Models } from 'openai/resources/models.mjs'; // Import Model type
import { addLog } from './logsSlice';

type ProviderStatus = 'idle' | 'validating' | 'valid' | 'invalid';

// Define a structure for a single provider
interface ProviderInfo {
  apiKey?: string;
  status: ProviderStatus;
  models: Models.Model[];
}

// Define the overall state shape
interface ProviderState {
  providers: {
    openai?: ProviderInfo;
    // Add other providers here in the future
  };
}

// Helper function to load initial state for a provider
// @ts-expect-error providerName is not used
const loadInitialProviderState = (providerName: string, storageKey: string): ProviderInfo => {
  const storedKey = localStorage.getItem(storageKey);
  return {
    apiKey: storedKey || undefined,
    // Assume stored key is valid initially, App.tsx will trigger validation
    status: storedKey ? 'valid' : 'idle',
    models: [], // Models will be fetched on validation
  };
};

const initialState: ProviderState = {
  providers: {
    openai: loadInitialProviderState('openai', 'openaiApiKey'),
    // Initialize other providers here if needed
  },
};

// Define the success payload for the thunk
interface SetOpenAiPayload {
  apiKey: string;
  models: Models.Model[];
}

// Async thunk for validating the OpenAI key and fetching models
export const checkAndSetOpenAiKey = createAsyncThunk<
  SetOpenAiPayload, // Return type on success
  string, // Argument type (the key to validate)
  { rejectValue: string } // Return type on failure (error message)
>('provider/checkAndSetOpenAiKey', async (apiKey, { dispatch, rejectWithValue }) => {
  try {
    const models = await validateOpenAiKey(apiKey);
    dispatch(addLog({ content: 'Model list fetched. API Key OK', level: 'info' }));
    localStorage.setItem('openaiApiKey', apiKey);
    return { apiKey, models }; // Return key and models
  } catch (error) {
    console.error('OpenAI key validation failed:', error);
    localStorage.removeItem('openaiApiKey'); // Remove invalid key
    let message = 'Failed to validate OpenAI API Key.';
    if (error instanceof Error) {
      if (error.message.includes('Incorrect API key provided')) {
        message = 'Incorrect OpenAI API Key provided.';
      } else if (error.message.includes('authentication')) {
        message = 'Authentication failed. Please check your OpenAI API Key.';
      }
    }
    return rejectWithValue(message);
  }
});

const providerSlice = createSlice({
  name: 'provider', // Changed slice name
  initialState,
  reducers: {
    // Clear data for a specific provider (e.g., OpenAI)
    clearProviderData: (state, action: PayloadAction<keyof ProviderState['providers']>) => {
      const providerName = action.payload;
      if (state.providers[providerName]) {
        state.providers[providerName] = {
          apiKey: undefined,
          status: 'idle',
          models: [],
        };
        // Construct local storage key dynamically if needed, or handle specifically
        if (providerName === 'openai') {
          localStorage.removeItem('openaiApiKey');
        }
        // Add logic for other providers if necessary
      }
    },
    // Set status for a specific provider
    setProviderStatus: (
      state,
      action: PayloadAction<{
        providerName: keyof ProviderState['providers'];
        status: ProviderStatus;
      }>,
    ) => {
      const { providerName, status } = action.payload;
      if (state.providers[providerName]) {
        state.providers[providerName]!.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAndSetOpenAiKey.pending, (state) => {
        if (!state.providers.openai) {
          state.providers.openai = { status: 'validating', models: [] };
        } else {
          state.providers.openai.status = 'validating';
          state.providers.openai.models = []; // Clear models during validation
        }
      })
      .addCase(checkAndSetOpenAiKey.fulfilled, (state, action) => {
        if (!state.providers.openai) {
          state.providers.openai = {
            status: 'valid',
            apiKey: action.payload.apiKey,
            models: action.payload.models,
          };
        } else {
          state.providers.openai.status = 'valid';
          state.providers.openai.apiKey = action.payload.apiKey;
          state.providers.openai.models = action.payload.models; // Store fetched models
        }
      })
      .addCase(checkAndSetOpenAiKey.rejected, (state) => {
        if (!state.providers.openai) {
          state.providers.openai = { status: 'invalid', models: [] };
        } else {
          state.providers.openai.status = 'invalid';
          state.providers.openai.apiKey = undefined;
          state.providers.openai.models = []; // Clear models on failure
        }
      });
  },
});

export const { clearProviderData, setProviderStatus } = providerSlice.actions;

// Selectors
export const selectOpenAiApiKey = (state: RootState) => state.provider.providers.openai?.apiKey;
export const selectOpenAiStatus = (state: RootState) =>
  state.provider.providers.openai?.status ?? 'idle';
export const selectOpenAiModels = (state: RootState) =>
  state.provider.providers.openai?.models ?? [];

export default providerSlice.reducer;
