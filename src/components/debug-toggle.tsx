import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { selectDebugVisible, toggleDebugVisible } from '@/features/appSlice';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function DebugToggle() {
  const dispatch = useAppDispatch();
  const debugVisible = useAppSelector(selectDebugVisible);

  const handleToggleDebug = () => {
    dispatch(toggleDebugVisible());
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={debugVisible ? 'default' : 'outline'}
          size="icon"
          onClick={handleToggleDebug}
          aria-label="Toggle debug panel"
          className={debugVisible ? 'bg-primary text-primary-foreground' : ''}
        >
          <Bug className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle debug panel</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Toggle Debug Panel</p>
      </TooltipContent>
    </Tooltip>
  );
}
