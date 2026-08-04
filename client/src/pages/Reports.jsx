import { useInfiniteQuery } from '@tanstack/react-query';
import { getReportsInfiniteQueryOptions } from '../queries/ReportQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { timestampToDayMonthYear } from '../utils/date';
import { messages } from './../messages/messages';
import { Button } from '@/components/ui/button';
import {
  REPORT_STATUS,
  REPORT_TYPE,
} from '@hermyx/shared/utils/reports.utils.js';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
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
        <div className='mb-6 border-b pb-4'>
          <h1 className='text-3xl font-bold tracking-tight'>Reports</h1>
        </div>
        <div className='flex flex-col sm:flex-row gap-4 mb-6'>
          <FilterCombobox
            items={DATE_OPTIONS}
            value={searchFilters.sortByDate}
            onChange={(val) => handleFilterChange('sortByDate', val)}
            placeholder='Sort by date...'
          />
          <FilterCombobox
            items={STATUS_OPTIONS}
            value={searchFilters.status}
            onChange={(val) => handleFilterChange('status', val)}
            placeholder='Sort by status...'
          />
          <FilterCombobox
            items={TYPE_OPTIONS}
            value={searchFilters.type}
            onChange={(val) => handleFilterChange('type', val)}
            placeholder='Sort by type...'
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

const FilterCombobox = ({ items, value, onChange, placeholder }) => {
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
        <ComboboxInput placeholder={placeholder} />
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
        <div className='flex justify-center p-8 text-muted-foreground'>
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
        <div className='text-center p-8 text-destructive border border-destructive/20 rounded-lg bg-destructive/5'>
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
        <div className='text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20'>
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
          <div
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            aria-label='Reports list'
          >
            {reports?.map((report) => (
              <ReportSearchCard
                key={report.rid}
                report={report}
              ></ReportSearchCard>
            ))}
          </div>
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
  return (
    <Card asChild className='justify-between'>
      <article>
        <CardHeader>
          <CardTitle asChild>
            <h2>
              {report.type === REPORT_TYPE.REPORT_PROFILE.ID
                ? `User ${report.payload.associated_user_id}`
                : report.type === REPORT_TYPE.REPORT_MISSION.ID
                  ? `Mission ${report.payload.associated_mission_id}`
                  : report.type === REPORT_TYPE.REPORT_ADVENTURER.ID ||
                      report.type === REPORT_TYPE.REVIEW_DISPUTE.ID
                    ? `Adventurer of vacancy ${report.payload.associated_vacancy_id} on mission ${report.payload.associated_mission_id}`
                    : `Applicant of mission ${report.payload.associated_mission_id}`}
              {` was reported by ${report.sender_id}`}
            </h2>
          </CardTitle>
          <CardDescription>{`Status: ${report.status}`}</CardDescription>
          <CardAction>
            <p>{timestampToDayMonthYear(report.date)}</p>
          </CardAction>
        </CardHeader>
        <CardContent className='flex flex-1 flex-col'>
          <div className='mb-4 line-clamp-4'>{report.message}</div>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link to={`/reports/${report.rid}`}>See report</Link>
          </Button>
        </CardFooter>
      </article>
    </Card>
  );
};
