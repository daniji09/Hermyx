import { React } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { X } from 'lucide-react';

export const FormAlert = ({ children, onClose }) => {
  return (
    <Alert variant='destructive' className='relative w-full'>
      <AlertCircleIcon />
      <AlertTitle>Form submission failed</AlertTitle>
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
