import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { REPORT_TYPE } from '@hermyx/shared/utils/reports.utils.js';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getReportByIdQueryOptions } from '../queries/ReportQueries';
import { timestampToDayMonthYear } from '../utils/date';
import { Button } from '@/components/ui/button';

export const Report = () => {
  // Report id
  const { id } = useParams();

  // Query options
  const enabledOption = !!id;
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery(
    getReportByIdQueryOptions(id, {
      enabled: enabledOption,
      retry: retryOption,
    }),
  );
  let errorMessage = error?.message;
  if (error?.response?.status === 404) {
    errorMessage = 'Oops! This report does not exist.';
  }
  return (
    <ReportPageContainer
      report={report}
      isLoading={isLoading}
      isError={isError}
      error={errorMessage}
    ></ReportPageContainer>
  );
};

const ReportPageContainer = ({ report, isLoading, isError, error }) => {
  return (
    <main className='p-4'>
      <ReportLoading isLoading={isLoading}>{'Seeking report...'}</ReportLoading>

      <ReportError isError={isError}>{`${error}`}</ReportError>

      <ReportContent report={report}></ReportContent>
    </main>
  );
};

const ReportLoading = ({ isLoading, children }) => {
  return (
    <main>
      {isLoading && (
        <div className='flex justify-center p-8 text-muted-foreground'>
          {children}
        </div>
      )}
    </main>
  );
};

const ReportError = ({ isError, children }) => {
  return (
    <main>
      {isError && (
        <div className='text-center p-8 text-destructive border border-destructive/20 rounded-lg bg-destructive/5'>
          {children}
        </div>
      )}
    </main>
  );
};

const ReportContent = ({ report }) => {
  if (!report) return null;
  console.log(report);
  return (
    <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
      <Card asChild className='justify-between'>
        <article>
          <CardHeader>
            <CardTitle asChild className='text-5xl'>
              <h1>
                {report.type === REPORT_TYPE.REPORT_PROFILE.ID
                  ? `User ${report.payload.associated_user_id}`
                  : report.type === REPORT_TYPE.REPORT_MISSION.ID
                    ? `Mission ${report.payload.associated_mission_id}`
                    : report.type === REPORT_TYPE.REPORT_ADVENTURER.ID ||
                        report.type === REPORT_TYPE.REVIEW_DISPUTE.ID
                      ? `Adventurer of vacancy ${report.payload.associated_vacancy_id} on mission ${report.payload.associated_mission_id}`
                      : `Applicant of mission ${report.payload.associated_mission_id}`}
                {` was reported by ${report.sender_id}`}
              </h1>
            </CardTitle>
            <CardDescription>{`Status: ${report.status}`}</CardDescription>
            <CardAction>
              <p>{timestampToDayMonthYear(report.date)}</p>
            </CardAction>
          </CardHeader>
          <CardContent className='flex flex-1 flex-col'>
            <div className='mb-4'>{report.message}</div>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link to={`/reports/${report.rid}`}>See report</Link>
            </Button>
          </CardFooter>
        </article>
      </Card>
    </section>
  );
};
