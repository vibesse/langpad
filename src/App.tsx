import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from './app/hooks';
import Sidebar from './components/sidebar';
import Debug from './components/debug';
import Flow from './components/flow';
import { selectFlowIds, addStepWithAction, cloneFlow } from './features/flowsSlice';
import { ApiKeyModal } from './components/ApiKeyModal';
import {
  selectOpenAiStatus,
  checkAndSetOpenAiKey,
  setProviderStatus,
  selectOpenAiModels,
} from './features/providerSlice';
import { selectDebugVisible } from './features/appSlice';
import { toast } from 'sonner';
import { flowRunner } from './lib/flowRunner';

function App() {
  const dispatch = useAppDispatch();
  const flowIds = useAppSelector(selectFlowIds);
  const openAiStatus = useAppSelector(selectOpenAiStatus);
  const openAiModels = useAppSelector(selectOpenAiModels);
  const debugVisible = useAppSelector(selectDebugVisible);

  useEffect(() => {
    const storedKey = localStorage.getItem('openaiApiKey');
    if (storedKey && (openAiStatus === 'idle' || openAiModels.length === 0)) {
      dispatch(checkAndSetOpenAiKey(storedKey))
        .unwrap()
        .catch((error) => {
          toast.error(error || 'Failed to validate stored OpenAI API Key.');
        });
    } else if (!storedKey && openAiStatus !== 'idle') {
      dispatch(setProviderStatus({ providerName: 'openai', status: 'idle' }));
    }
  }, [dispatch, openAiStatus, openAiModels.length]);

  // Removed useEffect that set an active flow

  const handleAddStep = (flowId: string) => {
    if (openAiStatus === 'valid') {
      dispatch(addStepWithAction(flowId));
    } else {
      toast.error('Please ensure your OpenAI API key is valid before adding steps.');
    }
  };

  const handleRunFlow = (flowId: string) => {
    if (openAiStatus === 'valid') {
      toast.info(`Running flow: ${flowId}`);
      flowRunner.runFlow(flowId).catch((error) => {
        toast.error(`Flow execution error: ${error.message}`);
      });
    } else {
      toast.error('Please ensure your OpenAI API key is valid before running flows.');
    }
  };

  const handleForkFlow = (flowId: string) => {
    if (openAiStatus === 'valid') {
      dispatch(cloneFlow(flowId));
      toast.success(`Flow ${flowId} forked.`);
    } else {
      toast.error('Please ensure your OpenAI API key is valid before forking flows.');
    }
  };

  const isModalOpen =
    openAiStatus === 'idle' || openAiStatus === 'invalid' || openAiStatus === 'validating';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Ensure full height and flex layout */}
      <ApiKeyModal open={isModalOpen} />
      <Sidebar /> {/* Removed props */}
      <div className="left-[300px] fixed top-0 bottom-0 right-0 overflow-auto pt-3 overflow-x-auto">
        <div className="flex-1 flex  overflow-y-hidden">
          {/* Added flex, overflow, padding, spacing */}
          {openAiStatus === 'valid' ? (
            flowIds.length > 0 ? (
              flowIds.map((flowId) => (
                <Flow
                  key={flowId}
                  flowId={flowId}
                  onRunFlow={handleRunFlow}
                  onForkFlow={handleForkFlow}
                  onAddStep={handleAddStep}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-full w-full text-muted-foreground">
                No flows exist. Add one from the sidebar.
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full w-full text-muted-foreground">
              {openAiStatus === 'validating'
                ? 'Validating API Key...'
                : 'Please enter your OpenAI API Key via the modal.'}
            </div>
          )}
        </div>
      </div>
      {debugVisible && <Debug />} {/* Removed selectedFlowId prop */}
    </div>
  );
}

export default App;
