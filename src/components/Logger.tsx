import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectLogs, LogEntry, LogLevel } from '@/features/logsSlice';
import { cn } from '@/lib/utils';

const getLogLevelClass = (level: LogLevel): string => {
  switch (level) {
    case 'error':
      return 'text-red-500';
    case 'warn':
      return 'text-yellow-500';
    case 'debug':
      return 'text-gray-500';
    case 'info':
    default:
      return 'text-foreground'; // Use default text color for info
  }
};

const formatTimestamp = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleTimeString();
  } catch (_e) {
    // Mark error variable as unused
    console.error('Error formatting timestamp:', isoString); // Optionally log the error
    return 'Invalid Date';
  }
};

export const Logger: React.FC = () => {
  const logs = useSelector(selectLogs);
  const logsEndRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-full flex flex-col bg-background border rounded-md p-2 font-mono text-sm overflow-y-scroll">
      <div className="flex-grow">
        {logs.map((log: LogEntry) => (
          <div key={log.id} className={cn('whitespace-pre-wrap', getLogLevelClass(log.level))}>
            <span className="text-muted-foreground">[{formatTimestamp(log.timestamp)}]</span>:{' '}
            {log.content} {/* Add space */}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};
