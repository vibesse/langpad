import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppDispatch } from '@/app/hooks';
import { checkAndSetOpenAiKey } from '@/features/providerSlice';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ApiKeyModalProps {
  open: boolean;
}

export function ApiKeyModal({ open }: ApiKeyModalProps) {
  const dispatch = useAppDispatch();
  const [apiKey, setApiKey] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const handleContinue = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your OpenAI API Key.');
      return;
    }
    setIsChecking(true);
    try {
      await dispatch(checkAndSetOpenAiKey(apiKey)).unwrap();
      toast.success('OpenAI API Key verified and saved.');
    } catch (error) {
      let errorMessage = 'Failed to validate OpenAI API Key.';
      if (typeof error === 'string') {
        errorMessage = error;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setIsChecking(false);
    }
  };

  const handleInteractOutside = (event: Event) => {
    event.preventDefault();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[425px]"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle>Enter OpenAI API Key</DialogTitle>
          <DialogDescription>
            Please enter your OpenAI API key to continue. Your key will be stored securely in your
            browser&apos;s local storage.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="openai-api-key" className="text-right">
              API Key
            </Label>
            <Input
              id="openai-api-key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="col-span-3"
              placeholder="sk-..."
              disabled={isChecking}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleContinue} disabled={isChecking}>
            {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isChecking ? 'Verifying...' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
