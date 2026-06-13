import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { timestampToDayMonthYear } from './../../../utils/date';
import { Button } from '@/components/ui/button';
import { Star, Users, HandCoins } from 'lucide-react';

export const MissionSearchCard = ({ mission }) => {
  return (
    <Card asChild className='justify-between'>
      <article>
        <CardHeader>
          <CardTitle asChild>
            <h2>{mission.title}</h2>
          </CardTitle>
          <CardDescription>
            <p>{timestampToDayMonthYear(mission.publication_date)}</p>
          </CardDescription>
          <CardAction>Card Action</CardAction>
        </CardHeader>
        <CardContent className='flex flex-1 flex-col'>
          <div className='mb-4'>{mission.description}</div>
          <div className='mt-auto flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <span className='sr-only'>Difficulty:</span>
              <span>{mission.difficulty}</span>
              <Star className='h-6 w-6' aria-hidden='true' />
            </div>
            <div className='flex items-center gap-2'>
              <span className='sr-only'>Vacancies:</span>
              <span>{mission.vacancies}</span>
              <Users className='h-6 w-6' aria-hidden='true' />
            </div>
            <div className='flex items-center gap-2'>
              <span className='sr-only'>Monetary reward:</span>
              <span>{mission.monetary_reward}$</span>
              <HandCoins className='h-6 w-6' aria-hidden='true' />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link to={`/missions/${mission.mid}`}>See mission</Link>
          </Button>
        </CardFooter>
      </article>
    </Card>
  );
};
