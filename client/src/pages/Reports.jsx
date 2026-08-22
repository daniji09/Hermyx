import { useInfiniteQuery } from '@tanstack/react-query';
import { getReportsInfiniteQueryOptions } from '../queries/ReportQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { timestampToDayMonthYear } from '../utils/date';
import { messages } from './../messages/messages';
import { Button } from '@/components/ui/button';
import { REPORT_STATUS, REPORT_TYPE } from '@hermyx/shared';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';
import { truncateText } from '../../../server/src/utils/string.util';

// Comboboxes   options
const DATE_OPTIONS = [
  { value: 'desc', label: 'Newest first' },
  { value: 'asc', label: 'Oldest first' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All statuses' },
  ...Object.values(REPORT_STATUS).map((status) => ({
    value: status.ID,
    label: status.LABEL,
  })),
];
const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All types' },
  ...Object.values(REPORT_TYPE).map((type) => ({
    value: type.ID,
    label: type.LABEL,
  })),
];

export const Reports = () => {
  const [searchFilters, setSearchFilters] = useState({
    date: undefined,
    status: undefined,
    type: undefined,
  });

  // Query options
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one component it should be isolated)
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery(
    getReportsInfiniteQueryOptions(PAGINATION_LIMIT.REPORTS, searchFilters, {
      retry: retryOption,
    }),
  );
  // Data destructure for cleaner code
  const reports = data?.pages.flatMap((page) => page.reports);

  const handleFilterChange = (key, value) => {
    setSearchFilters((prev) => ({
      ...prev,
      [key]: value === 'ALL' ? undefined : value,
    }));
  };

  return (
    <main>
      <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
        <div className='flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <MessageSquareWarning className='h-6 w-6' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h1 className='text-3xl font-bold tracking-tight wrap-break-words'>
              Reports
            </h1>
            <p className='text-muted-foreground'>
              Oversee platform moderation. Review, filter, and take action on
              community reports.
            </p>
          </div>
        </div>
      </section>
      <section
        className='w-full px-6 sm:px-8 lg:px-12 xl:px-16'
        aria-label='Filters section'
      >
        <div className='mt-4 mb-8 flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <FilterCombobox
            items={DATE_OPTIONS}
            value={searchFilters.sortByDate}
            onChange={(val) => handleFilterChange('sortByDate', val)}
            placeholder='Sort by date...'
            ariaLabel='Filter by date'
          />
          <FilterCombobox
            items={STATUS_OPTIONS}
            value={searchFilters.status}
            onChange={(val) => handleFilterChange('status', val)}
            placeholder='Sort by status...'
            ariaLabel='Filter by status'
          />
          <FilterCombobox
            items={TYPE_OPTIONS}
            value={searchFilters.type}
            onChange={(val) => handleFilterChange('type', val)}
            placeholder='Sort by type...'
            ariaLabel='Filter by type'
          />
        </div>
      </section>
      <ReportsSearchContainer
        reports={reports}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isLoading={isLoading}
        isError={isError}
      ></ReportsSearchContainer>
    </main>
  );
};

const FilterCombobox = ({ items, value, onChange, placeholder, ariaLabel }) => {
  const stringLabels = items.map((item) => item.label);
  const currentLabel = items.find((item) => item.value === value)?.label || '';
  const handleValueChange = (selectedLabel) => {
    const selectedItem = items.find((item) => item.label === selectedLabel);
    if (selectedItem) {
      onChange(selectedItem.value);
    }
  };
  return (
    <div className='w-full sm:w-55'>
      <Combobox
        items={stringLabels}
        value={currentLabel}
        onValueChange={handleValueChange}
      >
        <ComboboxInput
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
        />
        <ComboboxContent>
          <ComboboxEmpty>No results.</ComboboxEmpty>
          <ComboboxList>
            {(itemLabel) => (
              <ComboboxItem key={itemLabel} value={itemLabel}>
                {itemLabel}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
};

const ReportsSearchContainer = ({
  reports,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  isLoadingMessage = messages.REPORT.SEARCH_REPORTS.LOADING,
  isError,
  isErrorMessage = messages.REPORT.SEARCH_REPORTS.ERROR,
  noReportsMessage = messages.REPORT.SEARCH_REPORTS.NO_REPORTS,
}) => {
  return (
    <section className='w-full px-6 pb-4 sm:px-8 lg:px-12 xl:px-16'>
      <ReportsSearchLoading isLoading={isLoading}>
        {isLoadingMessage}
      </ReportsSearchLoading>

      <ReportsSearchError isError={isError}>
        {isErrorMessage}
      </ReportsSearchError>

      <NoReportsSearch reports={reports}>{noReportsMessage}</NoReportsSearch>

      <ReportsSearchContent
        reports={reports}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      ></ReportsSearchContent>
    </section>
  );
};

const ReportsSearchLoading = ({ isLoading, children }) => {
  return (
    <>
      {isLoading && (
        <div role='status' className='p-8 text-center text-muted-foreground'>
          {children}
        </div>
      )}
    </>
  );
};

const ReportsSearchError = ({ isError, children }) => {
  return (
    <>
      {isError && (
        <div
          role='alert'
          className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'
        >
          {children}
        </div>
      )}
    </>
  );
};

const NoReportsSearch = ({ reports, children }) => {
  return (
    <>
      {reports?.length === 0 && (
        <div
          role='status'
          aria-live='polite'
          className='text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20'
        >
          {children}
        </div>
      )}
    </>
  );
};

const ReportsSearchContent = ({
  reports,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}) => {
  return (
    <>
      {reports?.length > 0 && (
        <>
          <ul
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            aria-label='Reports list'
          >
            {reports?.map((report) => (
              <ReportSearchCard
                key={report.rid}
                report={report}
              ></ReportSearchCard>
            ))}
          </ul>
          <div className='flex align-middle justify-center py-5'>
            <Button
              onClick={() => fetchNextPage()}
              className='rounded-lg p-2 hover:cursor-pointer'
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {hasNextPage
                ? isFetchingNextPage
                  ? 'Loading'
                  : 'More reports'
                : 'No more reports to show'}
            </Button>
          </div>
        </>
      )}
    </>
  );
};
const ReportSearchCard = ({ report }) => {
  const linkClass =
    'user-link relative z-20 font-medium text-primary hover:underline transition-colors';

  const renderUserLink = (username) => {
    if (!username) return null;
    return (
      <Link
        to={`/users/${username}`}
        className={linkClass}
        title={username}
        aria-label={username}
        target='_blank'
        rel='noopener noreferrer'
      >
        {truncateText(username)}
      </Link>
    );
  };

  const renderMissionLink = () => {
    const missionId = report?.payload?.associated_mission_id;
    const title = report?.mission_title;
    if (!missionId) return null;
    return (
      <Link
        to={`/missions/${missionId}`}
        className={linkClass}
        title={title}
        aria-label={title}
        target='_blank'
        rel='noopener noreferrer'
      >
        {truncateText(title)}
      </Link>
    );
  };

  const generateTitle = () => {
    const { type, other_username, sender_username } = report || {};

    const senderLink = renderUserLink(sender_username);
    const otherUserLink = renderUserLink(other_username);
    const missionLink = renderMissionLink();

    switch (type) {
      case REPORT_TYPE.REPORT_ADVENTURER.ID:
        return (
          <>
            Adventurer {otherUserLink} of mission {missionLink} was reported by{' '}
            {senderLink}.
          </>
        );

      case REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID:
        return (
          <>
            Applicant {otherUserLink} of mission {missionLink} was reported by{' '}
            {senderLink}.
          </>
        );

      case REPORT_TYPE.REVIEW_DISPUTE.ID:
        return (
          <>
            Adventurer&lsquo;s {otherUserLink} participation of mission{' '}
            {missionLink} was reported by {senderLink}.
          </>
        );

      case REPORT_TYPE.REPORT_MISSION.ID:
        return (
          <>
            Mission {missionLink} was reported by {senderLink}.
          </>
        );

      default: // REPORT_USER
        return (
          <>
            User {otherUserLink} was reported by {senderLink}.
          </>
        );
    }
  };

  const title = (
    <span className='leading-relaxed font-normal text-foreground'>
      {generateTitle()}
    </span>
  );

  return (
    <li className='h-full'>
      <Card
        asChild
        className='justify-between group relative transition-all hover:border-primary/50 hover:shadow-md overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2'
      >
        <article className='flex flex-col h-full'>
          <Link
            to={`/reports/${report.rid}`}
            className='absolute inset-0 z-10'
            target='_blank'
            rel='noopener noreferrer'
          >
            <span className='sr-only'>See details for report {report.rid}</span>
          </Link>

          <CardHeader>
            <CardTitle asChild>
              <h2 className='group-hover:underline group-has-[.user-link:hover]:no-underline transition-colors'>
                {title}
              </h2>
            </CardTitle>

            {report.needs_admin_attention && (
              <CardDescription className='font-semibold text-destructive'>
                Needs admin attention
              </CardDescription>
            )}

            {report.unread_count > 0 && (
              <CardDescription className='font-semibold text-destructive'>
                {report.unread_count} unread message
                {report.unread_count === 1 ? '' : 's'}
              </CardDescription>
            )}

            <CardAction>
              <p>{timestampToDayMonthYear(report.date)}</p>
            </CardAction>
          </CardHeader>

          <CardContent className='flex flex-1 flex-col -mt-2'>
            <div className='mb-5 wrap-break-words wrap-anywhere line-clamp-3'>
              {report.message}
            </div>

            <div className='mt-auto flex items-center self-end gap-2'>
              <span className='sr-only'>Status:</span>
              <span className='italic text-muted-foreground text-sm'>
                {REPORT_STATUS[report?.status].LABEL}
              </span>
            </div>
          </CardContent>
        </article>
      </Card>
    </li>
  );
};
