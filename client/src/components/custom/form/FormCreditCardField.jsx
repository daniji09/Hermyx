import React, { useId } from 'react';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { CardElement } from '@stripe/react-stripe-js';

export const FormCreditCardField = ({
  invalid,
  id: externalId,
  label,
  description,
  error,
}) => {
  // Ids for descriptions and errors so the input is described successfully
  const reactId = useId();
  const id = externalId || reactId;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className='h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'>
        <CardElement />
      </div>
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      <FieldError
        id={errorId}
        aria-live='polite'
        className={!error ? 'invisible min-h-4' : 'min-h-4 text-xs'}
      >
        {error || ' '}
      </FieldError>
    </Field>
  );
};
