import { React } from 'react';
import { AlertCircleIcon, Check } from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { X } from 'lucide-react';

export const AlertStatic = ({ children, onClose, title, type }) => {
  return (
    <Alert variant={type} className='relative w-full'>
      {type === 'destructive' ? (
        <AlertCircleIcon />
      ) : (
        <Check className='h-4 w-4' aria-hidden='true'></Check>
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
      <AlertAction>
        <button
          className='p-1'
          type='button'
          aria-label='Close alert'
          onClick={onClose}
        >
          <X className='h-4 w-4' aria-hidden='true'></X>
        </button>
      </AlertAction>
    </Alert>
  );
};
