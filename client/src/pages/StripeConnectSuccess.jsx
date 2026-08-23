import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const StripeSuccess = () => {
  return (
    <main className='container mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center p-4 sm:p-6'>
      <Card className='w-full border-primary/20 text-center shadow-lg'>
        <CardHeader className='pb-4 pt-8'>
          <div className='mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary'>
            <CheckCircle2 className='h-12 w-12' aria-hidden='true' />
          </div>
          <CardTitle className='wrap-break-words text-3xl font-bold tracking-tight sm:text-4xl'>
            Account linked!
          </CardTitle>
          <CardDescription className='mt-2 text-base'>
            Your Stripe account has been successfully verified and linked.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-8 pb-8'>
          <p className='text-muted-foreground'>
            Now you can receive payments directly on your account. Everything is
            ready, so get out there and complete some missions!
          </p>

          <div className='flex justify-center'>
            <Button asChild size='lg' className='w-full sm:w-auto'>
              <Link to='/missions/mine'>Go to my missions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};
