import React, { useState, useRef, ChangeEvent } from 'react';
import { Label } from '@radix-ui/react-label';
import { Plus, Edit2, Check, Trash, Upload, File as FileIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { addFile, deleteFile, updateFileName, uploadFile } from '@/features/filesSlice';
import { Card } from './ui/card';

const FileManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const files = useAppSelector((state) => state.files.files);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const handleAddFile = () => {
    dispatch(addFile());
  };

  const handleDeleteFile = (id: string) => {
    dispatch(deleteFile(id));
  };

  const startNameEdit = (id: string, currentName: string) => {
    setEditingNameId(id);
    setEditedName(currentName);
  };

  const submitNameEdit = (id: string) => {
    if (editedName.trim()) {
      dispatch(updateFileName({ id, name: editedName }));
    }
    setEditingNameId(null);
  };

  const cancelNameEdit = () => {
    setEditingNameId(null);
  };

  const triggerFileUpload = (id: string) => {
    setActiveFileId(id);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!activeFileId || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      const base64Content = reader.result as string;
      dispatch(
        uploadFile({
          id: activeFileId,
          content: base64Content,
          type: file.type,
          size: file.size,
        }),
      );

      // Reset the input so the same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  // Function to handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setActiveFileId(id);

      const file = e.dataTransfer.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const base64Content = reader.result as string;
        dispatch(
          uploadFile({
            id: id,
            content: base64Content,
            type: file.type,
            size: file.size,
          }),
        );
      };

      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {files.map((file) => (
        <Card
          key={file.id}
          className="mb-4 p-3 pt-1 gap-3"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, file.id)}
        >
          <div className="flex justify-between items-center">
            {editingNameId === file.id ? (
              <>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xs font-semibold pl-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitNameEdit(file.id);
                    } else if (e.key === 'Escape') {
                      cancelNameEdit();
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={() => submitNameEdit(file.id)}>
                  <Check size={12} />
                </Button>
              </>
            ) : (
              <>
                <Label className="text-sm text-muted-foreground font-semibold pt-1">
                  {file.name}
                </Label>
                <div>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteFile(file.id)}>
                    <Trash size={12} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startNameEdit(file.id, file.name)}
                  >
                    <Edit2 size={12} />
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* File content area */}
          <div
            className="border border-dashed rounded-md p-2 mt-1 cursor-pointer flex flex-col items-center justify-center"
            onClick={() => triggerFileUpload(file.id)}
            style={{ minHeight: '100px' }}
          >
            {file.content ? (
              file.type.startsWith('image/') ? (
                <div className="w-full flex flex-col items-center">
                  <img
                    src={file.content}
                    alt={file.name}
                    className="max-h-[200px] max-w-full object-contain"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {(file.size / 1024).toFixed(2)} KB
                  </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <FileIcon size={40} />
                  <div className="text-xs text-muted-foreground mt-1">
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Click or drop file here</p>
              </div>
            )}
          </div>
        </Card>
      ))}

      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={handleAddFile}>
          <Plus className="mr-1" /> Add file
        </Button>
      </div>
    </div>
  );
};

export default FileManagement;
