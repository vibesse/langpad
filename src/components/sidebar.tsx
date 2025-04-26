import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import FileManagement from './file-management';
import VariableManagement from './variable-management';
import { ThemeToggle } from './theme-toggle';
import { DebugToggle } from './debug-toggle';

const Sidebar = () => {
  return (
    <div className="fixed top-0 bottom-0 left-0 p-3 w-[300px] border-r-accent border-r-1">
      <div className="flex-1 flex flex-col justify-between h-full overflow-auto">
        <Tabs defaultValue="variables">
          <TabsList className="w-full">
            <TabsTrigger value="variables" className="text-xs">
              Variables
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs">
              Files
            </TabsTrigger>
          </TabsList>
          <TabsContent value="variables">
            <VariableManagement />
          </TabsContent>
          <TabsContent value="files">
            <FileManagement />
          </TabsContent>
        </Tabs>
        <div className="flex items-center gap-2">
          <DebugToggle />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
