import React, { useId } from 'react';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export const FormInputField = ({
  invalid,
  id: externalId,
  label,
  description,
  error,
  ...props
}) => {
  // Ids for descriptions and errors so the input is described successfully
  const reactId = useId();
  const id = externalId || reactId;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-describedby={description ? descriptionId : undefined}
        aria-errormessage={error ? errorId : undefined}
        {...props}
      ></Input>
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
