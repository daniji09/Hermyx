import React, { useId, useState } from 'react';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

export const FormPasswordInputField = ({
  invalid,
  id: externalId,
  label,
  description,
  error,
  ...props
}) => {
  // State for show/hide password icon
  const [showPassword, setShowPassword] = useState(false);

  // Ids for descriptions and errors so the input is described successfully
  const reactId = useId();
  const id = externalId || reactId;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className='relative'>
        <Input
          id={id}
          aria-describedby={description ? descriptionId : undefined}
          aria-errormessage={error ? errorId : undefined}
          {...props}
          type={showPassword ? 'text' : props.type}
        ></Input>
        <button
          type='button'
          onClick={() => setShowPassword(!showPassword)}
          className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors'
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? (
            <EyeOff className='h-6 w-6' />
          ) : (
            <Eye className='h-6 w-6' />
          )}
        </button>
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
