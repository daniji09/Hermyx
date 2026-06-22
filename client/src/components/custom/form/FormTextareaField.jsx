import React, { useId, useState } from 'react';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';

export const FormTextareaField = ({
  invalid,
  id: externalId,
  label,
  description,
  error,
  maxLength,
  onChange,
  defaultValue,
  value,
  ...props
}) => {
  // Ids for descriptions and errors so the input is described successfully
  const reactId = useId();
  const id = externalId || reactId;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  // States and logic for showing character counter
  const initialCount = value
    ? String(value).length
    : defaultValue
      ? String(defaultValue).length
      : 0;
  const [charCount, setCharCount] = useState(initialCount);

  const handleChange = (e) => {
    setCharCount(e.target.value.length);
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        aria-describedby={description ? descriptionId : undefined}
        aria-errormessage={error ? errorId : undefined}
        maxLength={maxLength}
        onChange={handleChange}
        defaultValue={defaultValue}
        value={value}
        {...props}
      ></Textarea>
      <div className='flex justify-between items-start pt-1'>
        <div className='flex flex-col'>
          {description && (
            <FieldDescription id={descriptionId}>
              {description}
            </FieldDescription>
          )}
          <FieldError
            id={errorId}
            aria-live='polite'
            className={!error ? 'invisible min-h-4' : 'min-h-4 text-[0.8rem]'}
          >
            {error || ' '}
          </FieldError>
        </div>

        {maxLength && (
          <span className={`text-xs ml-4 shrink-0 text-muted-foreground`}>
            {charCount} / {maxLength}
          </span>
        )}
      </div>
    </Field>
  );
};
