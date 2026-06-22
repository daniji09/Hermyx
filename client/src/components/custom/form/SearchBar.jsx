import React, { useId, useState } from 'react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group';
import { FieldLegend, FieldSet } from '@/components/ui/field';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SearchBar = ({ id: externalId, legend, ...props }) => {
  // Ids for descriptions and errors so the input is described successfully
  const reactId = useId();
  const id = externalId || reactId;
  const fieldId = `${id}_input`;
  const searchId = `${id}-search`;
  const buttonId = `${id}-button`;

  // For search bar
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  // No React useAction because is a GET, it's done by Maps
  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/missions?title=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form
      id={id}
      onSubmit={handleSearch}
      noValidate
      className='flex items-center w-full min-w-25 md:min-w-100 lg:min-w-150 max-w-md relative'
    >
      <InputGroup className='bg-white flex justify-between'>
        <div className='flex'>
          <FieldSet>
            <FieldLegend className='hidden'>{legend}</FieldLegend>
            <InputGroupInput
              id={fieldId}
              name={fieldId}
              type='text'
              autoComplete='off'
              onChange={(e) => setQuery(e.target.value)}
              required
              placeholder='Search mission in Hermyx...'
              aria-label='Search mission'
              aria-describedby={searchId}
              {...props}
              className='w-full min-w-25 md:min-w-75 lg:min-w-125 max-w-md'
            />
          </FieldSet>
          <InputGroupAddon>
            <Search
              id={searchId}
              aria-label='Content to search:'
              aria-hidden='true'
            />
          </InputGroupAddon>
        </div>
        <InputGroupAddon align='inline-end'>
          <InputGroupButton id={buttonId} type='submit' variant='secondary'>
            {'Search'}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
};
