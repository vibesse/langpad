import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Variable {
  id: string;
  name: string;
  value: string;
}

interface VariablesState {
  variables: Variable[];
  lastId: number;
}

const initialState: VariablesState = {
  variables: [
    {
      id: '1',
      name: '$default_var',
      value: '',
    },
  ],
  lastId: 1,
};

export const variablesSlice = createSlice({
  name: 'variables',
  initialState,
  reducers: {
    addVariable: (state) => {
      const newId = (state.lastId + 1).toString();
      state.variables.push({
        id: newId,
        name: `$variable${state.lastId}`,
        value: '',
      });
      state.lastId += 1;
    },
    updateVariableName: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const { id, name } = action.payload;
      // Check if a variable with the same name already exists
      const nameExists = state.variables.some(
        (variable) => variable.name === name && variable.id !== id,
      );

      if (!nameExists) {
        const variable = state.variables.find((v) => v.id === id);
        if (variable) {
          variable.name = name;
        }
      }
    },
    updateVariableValue: (state, action: PayloadAction<{ id: string; value: string }>) => {
      const { id, value } = action.payload;
      const variable = state.variables.find((v) => v.id === id);
      if (variable) {
        variable.value = value;
      }
    },
    deleteVariable: (state, action: PayloadAction<string>) => {
      state.variables = state.variables.filter((variable) => variable.id !== action.payload);
    },
  },
});

export const { addVariable, updateVariableName, updateVariableValue, deleteVariable } =
  variablesSlice.actions;

// Selector to get the variables array
export const selectVariables = (state: { variables: VariablesState }) => state.variables.variables;

export default variablesSlice.reducer;
