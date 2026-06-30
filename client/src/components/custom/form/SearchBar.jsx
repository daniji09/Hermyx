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
  const trimmedQuery = query.trim();

  // No React useAction because is a GET, it's done by Maps
  const handleSearch = (e) => {
    e.preventDefault();
    if (trimmedQuery) {
      navigate(`/missions?title=${encodeURIComponent(trimmedQuery)}`);
      setQuery('');
    }
  };

  const handleMissionSearch = () => {
    if (trimmedQuery) {
      navigate(`/missions?title=${encodeURIComponent(trimmedQuery)}`);
      setQuery('');
    }
  };

  const handleUserSearch = () => {
    if (trimmedQuery) {
      navigate(`/users/search?username=${encodeURIComponent(trimmedQuery)}`);
      setQuery('');
    }
  };

  return (
    <form
      id={id}
      onSubmit={handleSearch}
      noValidate
      className='flex items-center w-full min-w-25 md:min-w-75 lg:min-w-100 max-w-md relative'
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
              className='w-full min-w-25 md:min-w-50 lg:min-w-75 max-w-md'
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

      {trimmedQuery && (
        <div className='absolute top-full left-0 right-0 z-20 mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm'>
          <button
            type='button'
            onClick={handleMissionSearch}
            className='block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100'
          >
            Search missions
          </button>
          <button
            type='button'
            onClick={handleUserSearch}
            className='block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100'
          >
            Search users
          </button>
        </div>
      )}
    </form>
  );
};
