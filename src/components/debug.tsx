import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppSelector } from '@/app/hooks';
import { selectFlowForExecutionAsString } from '@/features/flowSelectors';
import { selectActiveFlowId } from '@/features/flowsSlice';
import { Logger } from './Logger';

const Debug = () => {
  const activeFlowId = useAppSelector(selectActiveFlowId);
  const flowSchemaString = useAppSelector((state) =>
    activeFlowId ? selectFlowForExecutionAsString(state, activeFlowId, true) : null,
  );

  return (
    <div className="fixed top-0 bottom-0 right-0 p-3 w-[300px] border-l-1 border-l-accent">
      <Tabs defaultValue="logs" className="h-full flex flex-col">
        <TabsList className="w-full">
          <TabsTrigger value="logs" className="text-xs">
            Logs
          </TabsTrigger>
          <TabsTrigger value="flow-schema" className="text-xs">
            Flow Schema
          </TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="flex-grow overflow-hidden">
          <Logger />
        </TabsContent>
        <TabsContent
          value="flow-schema"
          className="flex-grow overflow-auto bg-background border rounded-md p-2"
        >
          <pre className="text-xs whitespace-pre-wrap break-words">
            {flowSchemaString ?? 'No active flow selected or flow data unavailable.'}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Debug;
