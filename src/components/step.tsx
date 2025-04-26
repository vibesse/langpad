import React from 'react';
import { useAppSelector, useAppDispatch } from '@/app/hooks';
import { Button } from '@/components/ui/button';
import { Play, Plus, Trash2 } from 'lucide-react';
import { addAction } from '@/features/actionsSlice';
import { addActionToStep, removeStep, selectStepsByFlowId } from '@/features/flowsSlice';
import Action from './action';
import { flowRunner } from '@/lib/flowRunner';
// Removed step-level run ID; actions derive run state from latest flow run
import { toast } from 'sonner';

interface StepProps {
  id: string;
  flowId: string;
  stepNumber: number;
}

const Step: React.FC<StepProps> = ({ id: stepId, flowId: currentFlowId, stepNumber }) => {
  const dispatch = useAppDispatch();
  const steps = useAppSelector((state) => selectStepsByFlowId(state, currentFlowId));
  const step = steps.find((s) => s.id === stepId);

  // No local run state; actions consume latest flow run state directly

  const actionIds = step?.actionIds || [];

  const handleAddAction = () => {
    const actionResult = dispatch(addAction());
    const actionId = actionResult.payload;

    // Associate the action with this step in the flow
    dispatch(addActionToStep({ flowId: currentFlowId, stepId, actionId }));
  };

  const handleRemoveStep = () => {
    dispatch(removeStep({ flowId: currentFlowId, stepId }));
  };

  const handleRunStep = async () => {
    toast.info(`Running step ${stepNumber}`);

    // Find the index of this step in the flow
    const stepIndex = steps.findIndex((s) => s.id === stepId);

    if (stepIndex !== -1) {
      try {
        await flowRunner.runStep(currentFlowId, stepIndex);
      } catch (error) {
        toast.error(
          `Step execution error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      toast.error('Could not find step index');
    }
  };

  return (
    <div className="mb-4 border-4 border-accent bg-background px-4 py-2">
      <div className="flex flex-row items-center justify-between space-y-0">
        <div className="font-medium flex items-center gap-2 text-xs">Step {stepNumber}</div>
        <div>
          <Button variant="ghost" size="sm" onClick={handleRemoveStep}>
            <Trash2 size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRunStep}>
            <Play size={16} />
          </Button>
        </div>
      </div>
      <div className="pb-3">
        <div className="space-y-3">
          {actionIds.map((actionId) => (
            <Action key={actionId} id={actionId} flowId={currentFlowId} stepId={stepId} />
          ))}
          <Button variant={'secondary'} size={'sm'} className="w-full" onClick={handleAddAction}>
            <Plus />
            Add LLM call
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Step;
