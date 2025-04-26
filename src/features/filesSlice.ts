import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface File {
  id: string;
  name: string;
  content: string; // base64 content
  type: string; // MIME type
  size: number; // file size in bytes
}

interface FilesState {
  files: File[];
  lastId: number;
}

const initialState: FilesState = {
  files: [
    {
      id: '1',
      name: 'file_1',
      content: '',
      type: '',
      size: 0,
    },
  ],
  lastId: 1,
};

export const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    addFile: (state) => {
      const newId = (state.lastId + 1).toString();
      state.files.push({
        id: newId,
        name: `file_${state.lastId + 1}`,
        content: '',
        type: '',
        size: 0,
      });
      state.lastId += 1;
    },
    updateFileName: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const { id, name } = action.payload;
      // Check if a file with the same name already exists
      const nameExists = state.files.some((file) => file.name === name && file.id !== id);

      if (!nameExists) {
        const file = state.files.find((f) => f.id === id);
        if (file) {
          file.name = name;
        }
      }
    },
    uploadFile: (
      state,
      action: PayloadAction<{ id: string; content: string; type: string; size: number }>,
    ) => {
      const { id, content, type, size } = action.payload;
      const file = state.files.find((f) => f.id === id);
      if (file) {
        file.content = content;
        file.type = type;
        file.size = size;
      }
    },
    deleteFile: (state, action: PayloadAction<string>) => {
      state.files = state.files.filter((file) => file.id !== action.payload);
    },
  },
});

export const { addFile, updateFileName, uploadFile, deleteFile } = filesSlice.actions;

export default filesSlice.reducer;
