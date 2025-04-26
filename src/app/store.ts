import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import { actionsSlice } from '@/features/actionsSlice';
import variablesReducer from '@/features/variablesSlice';
import filesReducer from '@/features/filesSlice';
import appReducer from '@/features/appSlice';
import flowsReducer from '@/features/flowsSlice';
import providerReducer from '@/features/providerSlice';
import logsReducer from '@/features/logsSlice';
import runsReducer from '@/features/runsSlice';

export const store = configureStore({
  reducer: {
    actions: actionsSlice.reducer,
    variables: variablesReducer,
    files: filesReducer,
    app: appReducer,
    flows: flowsReducer,
    provider: providerReducer,
    logs: logsReducer,
    runs: runsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these paths in the state
        ignoredPaths: ['provider.providers.openai.models'],
        // Ignore these action types
        ignoredActionPaths: ['payload.models'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
