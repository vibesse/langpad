import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Plus, Play, Copy, Trash2 } from 'lucide-react';
import Step from './step';
import { selectFlowById, updateFlowName, removeFlow } from '@/features/flowsSlice';
import { Input } from './ui/input';
import { toast } from 'sonner';

interface FlowColumnProps {
  flowId: string;
  onRunFlow: (flowId: string) => void;
  onForkFlow: (flowId: string) => void;
  onAddStep: (flowId: string) => void;
}

const FlowColumn: React.FC<FlowColumnProps> = ({ flowId, onRunFlow, onForkFlow, onAddStep }) => {
  const dispatch = useAppDispatch();
  const flow = useAppSelector((state) => selectFlowById(state, flowId));
  const [isEditingName, setIsEditingName] = useState(false);
  const [currentName, setCurrentName] = useState(flow?.name || '');

  React.useEffect(() => {
    if (flow) {
      setCurrentName(flow.name || '');
    }
  }, [flow?.name]);

  if (!flow) {
    return null; // Or some placeholder/error display
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentName(e.target.value);
  };

  const handleNameBlur = () => {
    if (flow && currentName !== flow.name) {
      dispatch(updateFlowName({ flowId: flow.id, name: currentName }));
      toast.success(`Flow name updated to "${currentName}"`);
    }
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setCurrentName(flow?.name || '');
      setIsEditingName(false);
    }
  };

  const handleDeleteFlow = () => {
    if (window.confirm(`Are you sure you want to delete flow "${flow.name || flow.id}"?`)) {
      dispatch(removeFlow(flowId));
      toast.success(`Flow "${flow.name || flow.id}" deleted.`);
    }
  };

  return (
    <div className="w-[450px] flex-shrink-0 p-4 flex flex-col space-y-4 h-full border-2 border-dashed mx-2 resize-x">
      <div className="flex justify-between items-center flex-shrink-0">
        {isEditingName ? (
          <Input
            value={currentName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            autoFocus
            className="text-lg font-semibold h-9" // Adjusted height
          />
        ) : (
          <h2
            className="text-lg font-semibold truncate cursor-pointer"
            title={flow.name || `Flow ${flow.id}`}
            onClick={() => setIsEditingName(true)}
          >
            {flow.name || `Flow ${flow.id.substring(0, 8)}`}
          </h2>
        )}
        <div className="flex gap-1 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleDeleteFlow}
            title="Delete Flow"
          >
            <Trash2 size={16} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => onForkFlow(flowId)}
            title="Fork Flow"
          >
            <Copy size={16} />
            {/* Fork */}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={() => onRunFlow(flowId)}
            title="Run Flow"
          >
            <Play size={16} />
          </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto space-y-4 pr-1 custom-scrollbar">
        {flow.steps.map((step, index) => (
          <Step key={step.id} id={step.id} flowId={flowId} stepNumber={index + 1} />
        ))}
      </div>
      {/* Add Step Button */}
      <Button
        size="lg"
        variant={'ghost'}
        className="w-full flex-shrink-0" // Added flex-shrink-0
        onClick={() => onAddStep(flowId)}
      >
        <Plus />
        Add step
      </Button>
    </div>
  );
};

export default FlowColumn;
