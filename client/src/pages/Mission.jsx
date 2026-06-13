import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getMissionByIdQueryOptions } from './../queries/MissionsQueries';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { timestampToDayMonthYear } from './../utils/date';
import { Button } from '@/components/ui/button';
import { Star, Users, HandCoins } from 'lucide-react';

export const Mission = () => {
  // Mission id
  const { id } = useParams();

  // Query options
  const enabledOption = !!id;
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data: mission,
    isLoading,
    isError,
    error,
  } = useQuery(
    getMissionByIdQueryOptions(id, {
      enabled: enabledOption,
      retry: retryOption,
    }),
  );

  // Early returns for each state
  if (isLoading) return <p>Seeking mission...</p>;

  if (isError) {
    if (error.response?.status === 404)
      return <p>Oops! This mission does not exist or it has been deleted.</p>;

    return <p>Error seeking mission: {error.message}.</p>;
  }

  if (!mission) return <p>Mission not found.</p>;

  return (
    <Card asChild className='m-4'>
      <main>
        <CardHeader>
          <CardTitle asChild className='text-5xl'>
            <h1>{mission.title}</h1>
          </CardTitle>
          <CardDescription className='text-xl'>
            <p>{timestampToDayMonthYear(mission.publication_date)}</p>
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-1 flex-col text-lg'>
          <div className='mb-4'>{mission.description}</div>
          <div className='mt-auto flex flex-col gap-2'>
            <div className='flex items-center gap-2'>
              <span>Difficulty:</span>
              <span>{mission.difficulty}</span>
              <Star className='h-6 w-6' aria-hidden='true' />
            </div>
            <div className='flex items-center gap-2'>
              <span>Vacancies:</span>
              <span>{mission.vacancies}</span>
              <Users className='h-6 w-6' aria-hidden='true' />
            </div>
            <div className='flex items-center gap-2'>
              <span>Monetary reward:</span>
              <span>{mission.monetary_reward}$</span>
              <HandCoins className='h-6 w-6' aria-hidden='true' />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button>Contact</Button>
        </CardFooter>
      </main>
    </Card>
  );
};
