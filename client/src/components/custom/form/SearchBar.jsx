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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const trimmedQuery = query.trim();

  // No React useAction because is a GET, it's done by Maps
  const handleSearch = (e) => {
    e.preventDefault();
    if (trimmedQuery) {
      navigate(`/missions?title=${encodeURIComponent(trimmedQuery)}`);
      setIsMenuOpen(false);
    }
  };

  const handleMissionSearch = () => {
    if (trimmedQuery) {
      navigate(`/missions?title=${encodeURIComponent(trimmedQuery)}`);
      setIsMenuOpen(false);
    }
  };

  const handleUserSearch = () => {
    if (trimmedQuery) {
      navigate(`/users/search?username=${encodeURIComponent(trimmedQuery)}`);
      setIsMenuOpen(false);
    }
  };

  return (
    <form
      id={id}
      onSubmit={handleSearch}
      noValidate
      className='relative z-[10001] flex w-full max-w-md items-center min-w-25 md:min-w-75 lg:min-w-100'
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
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsMenuOpen(true);
              }}
              onFocus={() => setIsMenuOpen(true)}
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

      {trimmedQuery && isMenuOpen && (
        <div className='absolute left-0 right-0 top-full z-[10001] mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm'>
          <button
            type='button'
            onClick={handleMissionSearch}
            className='block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100'
          >
            <span className='text-slate-700'>
              Search for{' '}
              <span className='font-semibold text-slate-900'>
                {`"${trimmedQuery}"`}
              </span>{' '}
              in missions
            </span>
          </button>
          <button
            type='button'
            onClick={handleUserSearch}
            className='block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100'
          >
            <span className='text-slate-700'>
              Search for{' '}
              <span className='font-semibold text-slate-900'>
                {`"${trimmedQuery}"`}
              </span>{' '}
              in users
            </span>
          </button>
        </div>
      )}
    </form>
  );
};
