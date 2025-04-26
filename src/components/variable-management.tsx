import React, { useState } from 'react';
import { Label } from '@radix-ui/react-label';
import { Plus, Edit2, Check, Trash } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  addVariable,
  deleteVariable,
  updateVariableName,
  updateVariableValue,
} from '@/features/variablesSlice';
import { Card } from './ui/card';

const VariableManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const variables = useAppSelector((state) => state.variables.variables);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');

  const handleAddVariable = () => {
    dispatch(addVariable());
  };

  const handleDeleteVariable = (id: string) => {
    dispatch(deleteVariable(id));
  };

  const handleUpdateValue = (id: string, value: string) => {
    dispatch(updateVariableValue({ id, value }));
  };

  const startNameEdit = (id: string, currentName: string) => {
    setEditingNameId(id);
    setEditedName(currentName);
  };

  const submitNameEdit = (id: string) => {
    // Validate that the name starts with $
    let nameToUpdate = editedName;
    if (!editedName.startsWith('$')) {
      nameToUpdate = '$' + editedName;
    }

    dispatch(updateVariableName({ id, name: nameToUpdate }));
    setEditingNameId(null);
  };

  const cancelNameEdit = () => {
    setEditingNameId(null);
  };

  return (
    <div>
      {variables.map((variable) => (
        <Card key={variable.id} className="mb-4 p-3 pt-1 gap-3">
          <div className="flex justify-between items-center">
            {editingNameId === variable.id ? (
              <>
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xs font-semibold pl-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      submitNameEdit(variable.id);
                    } else if (e.key === 'Escape') {
                      cancelNameEdit();
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" onClick={() => submitNameEdit(variable.id)}>
                  <Check size={12} />
                </Button>
              </>
            ) : (
              <>
                <Label className="text-sm text-muted-foreground font-semibold pt-1">
                  {variable.name}
                </Label>
                {variable.id !== '1' && (
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteVariable(variable.id)}
                    >
                      <Trash size={12} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => startNameEdit(variable.id, variable.name)}
                    >
                      <Edit2 size={12} />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <Textarea
              value={variable.value}
              onChange={(e) => handleUpdateValue(variable.id, e.target.value)}
              className="text-xs"
              rows={3}
              placeholder="Enter variable value..."
            />
          </div>
        </Card>
      ))}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" onClick={handleAddVariable}>
          <Plus className="mr-1" /> Add variable
        </Button>
      </div>
    </div>
  );
};

export default VariableManagement;
