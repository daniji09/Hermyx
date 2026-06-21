import React, { useId } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { Search } from 'lucide-react';

export const SearchBar = ({
  id: externalId,
  action,
  legend,
  isPending,
  ...props
}) => {
  // Ids for descriptions and errors so the input is described successfully
  const reactId = useId();
  const id = externalId || reactId;
  const fieldId = `${id}_input`;
  const searchId = `${id}-search`;
  const buttonId = `${id}-button`;
  return (
    <form id={id} action={action} noValidate className='w-150'>
      <InputGroup className='bg-white flex justify-between'>
        <div className='flex'>
          <FieldSet>
            <FieldLegend className='hidden'>{legend}</FieldLegend>
            <InputGroupInput
              id={fieldId}
              name={fieldId}
              type='text'
              autoComplete='off'
              required
              placeholder='Search mission in Hermyx...'
              aria-describedby={searchId}
              disabled={isPending}
              {...props}
              className='w-125'
            />
          </FieldSet>
          <InputGroupAddon>
            <Search id={searchId} aria-label='Content to search:' />
          </InputGroupAddon>
        </div>
        <InputGroupAddon align='inline-end'>
          <InputGroupButton id={buttonId} type='submit' variant='secondary'>
            {isPending ? 'Searching...' : 'Search'}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
