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
  const reactId = useId();
  const id = externalId || reactId;
  const fieldId = `${id}_input`;
  const searchId = `${id}-search`;
  const buttonId = `${id}-button`;

  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const trimmedQuery = query.trim();

  const handleSearch = (e) => {
    e.preventDefault();
    if (trimmedQuery) {
      navigate(`/missions?title=${encodeURIComponent(trimmedQuery)}`);
      setIsMenuOpen(false);
      setFocusedIndex(-1);
    }
  };

  const handleMissionSearch = () => {
    if (trimmedQuery) {
      navigate(`/missions?title=${encodeURIComponent(trimmedQuery)}`);
      setIsMenuOpen(false);
      setFocusedIndex(-1);
    }
  };

  const handleUserSearch = () => {
    if (trimmedQuery) {
      navigate(`/users/search?username=${encodeURIComponent(trimmedQuery)}`);
      setIsMenuOpen(false);
      setFocusedIndex(-1);
    }
  };

  const handleKeyDown = (e) => {
    if (!isMenuOpen || !trimmedQuery) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      if (focusedIndex === 0) {
        e.preventDefault();
        handleMissionSearch();
      } else if (focusedIndex === 1) {
        e.preventDefault();
        handleUserSearch();
      }
    } else if (e.key === 'Escape') {
      setIsMenuOpen(false);
      setFocusedIndex(-1);
    }
  };

  return (
    <form
      id={id}
      onSubmit={handleSearch}
      noValidate
      className='relative z-50 flex w-full items-center'
    >
      <InputGroup className='bg-background w-full flex justify-between'>
        <div className='flex flex-1 w-full'>
          <FieldSet className='flex-1'>
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
                setFocusedIndex(-1);
              }}
              onFocus={() => setIsMenuOpen(true)}
              onKeyDown={handleKeyDown}
              required
              placeholder='Search service in Hermyx...'
              aria-label='Search service'
              aria-describedby={searchId}
              {...props}
              className='w-full'
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
        <div className='absolute left-0 right-0 top-full mt-2 rounded-xl border border-border bg-background p-2 shadow-sm'>
          <button
            type='button'
            onClick={handleMissionSearch}
            onMouseEnter={() => setFocusedIndex(0)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              focusedIndex === 0
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent'
            }`}
          >
            <span
              className={
                focusedIndex === 0
                  ? 'text-accent-foreground'
                  : 'text-muted-foreground'
              }
            >
              Search for{' '}
              <span className='font-semibold text-foreground'>
                {`"${trimmedQuery}"`}
              </span>{' '}
              in services
            </span>
          </button>

          <button
            type='button'
            onClick={handleUserSearch}
            onMouseEnter={() => setFocusedIndex(1)}
            className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              focusedIndex === 1
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent'
            }`}
          >
            <span
              className={
                focusedIndex === 1
                  ? 'text-accent-foreground'
                  : 'text-muted-foreground'
              }
            >
              Search for{' '}
              <span className='font-semibold text-foreground'>
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
