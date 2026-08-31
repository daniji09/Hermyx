import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Compass, Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <>
      <title>{`Page not found | Hermyx`}</title>
      <meta name='description' content={`Page not found in Hermyx.`}></meta>
      <main className='container mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-4 text-center'>
        <div className='space-y-6'>
          <div className='mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20'>
            <Compass className='h-10 w-10 animate-pulse' aria-hidden='true' />
          </div>

          <div className='space-y-2'>
            <h1 className='text-4xl font-extrabold tracking-tight sm:text-5xl'>
              Page not found
            </h1>
            <p className='text-muted-foreground text-lg max-w-md mx-auto'>
              Oops! It seems this service wandered off the map or the path
              doesn&lsquo;t exist.
            </p>
          </div>

          <div className='flex flex-col sm:flex-row justify-center gap-4 pt-4'>
            <Button asChild size='lg' className='gap-2'>
              <Link to='/'>
                <Home className='h-4 w-4' aria-hidden='true' />
                Back to home
              </Link>
            </Button>
            <Button asChild variant='outline' size='lg' className='gap-2'>
              <Link to='/services'>
                <Compass className='h-4 w-4' aria-hidden='true' />
                Explore services
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
};
