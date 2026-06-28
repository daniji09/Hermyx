import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, Plus, Star, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertStatic } from './AlertStatic';
import {
  createCardSetupIntentMutationOptions,
  deleteSavedCardMutationOptions,
  getSavedCardsQueryOptions,
  setDefaultSavedCardMutationOptions,
} from '../../queries/PaymentQueries';

const emptyCards = [];

export const StripeManagement = () => {
  const queryClient = useQueryClient();
  const stripe = useStripe();
  const elements = useElements();
  const [isAdding, setIsAdding] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  const { data, isLoading } = useQuery(
    getSavedCardsQueryOptions({
      onError: (error) => {
        setErrors({
          general:
            error.response?.data?.errors?.general ||
            error.response?.data?.error ||
            'Could not load your cards.',
        });
      },
    }),
  );

  const createCardSetupIntentMutation = useMutation(
    createCardSetupIntentMutationOptions(),
  );

  const setDefaultSavedCardMutation = useMutation(
    setDefaultSavedCardMutationOptions({
      onSuccess: async () => {
        setMessage('Default card updated.');
        await queryClient.invalidateQueries({ queryKey: ['getSavedCards'] });
      },
      onError: (error) => {
        setErrors({
          general:
            error.response?.data?.errors?.general ||
            error.response?.data?.error ||
            'Could not update the default card.',
        });
      },
      onSettled: () => {
        setProcessingId(null);
      },
    }),
  );

  const deleteSavedCardMutation = useMutation(
    deleteSavedCardMutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['getSavedCards'] });
      },
      onError: (error) => {
        setErrors({
          general:
            error.response?.data?.errors?.general ||
            error.response?.data?.error ||
            'Could not delete the card.',
        });
      },
      onSettled: () => {
        setProcessingId(null);
      },
    }),
  );

  const cards = data?.cards || emptyCards;
  const defaultPaymentMethodId = data?.defaultPaymentMethodId || null;
  const hasCards = cards.length > 0;

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      if (a.id === defaultPaymentMethodId) return -1;
      if (b.id === defaultPaymentMethodId) return 1;
      return 0;
    });
  }, [cards, defaultPaymentMethodId]);

  useEffect(() => {
    if (!data) return;
    setErrors({});
  }, [data]);

  const handleAddCard = async () => {
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;
    setMessage('');
    setProcessingId('add');
    setErrors({});

    try {
      const { clientSecret } =
        await createCardSetupIntentMutation.mutateAsync();

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (result.error) {
        setErrors({ general: result.error.message });
        return;
      }

      const paymentMethodId = result.setupIntent?.payment_method;

      if (!hasCards && paymentMethodId) {
        await setDefaultSavedCardMutation.mutateAsync(paymentMethodId);
      }

      cardElement.clear();
      setIsAdding(false);
      await queryClient.invalidateQueries({ queryKey: ['getSavedCards'] });
    } catch (error) {
      setErrors({
        general:
          error.response?.data?.errors?.general ||
          error.response?.data?.error ||
          'Could not add the card.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSetDefault = (paymentMethodId) => {
    setIsAlertClosed(false);
    setProcessingId(paymentMethodId);
    setMessage('');
    setErrors({});
    setDefaultSavedCardMutation.mutate(paymentMethodId);
  };

  const handleDelete = (paymentMethodId) => {
    setProcessingId(paymentMethodId);
    setMessage('');
    setErrors({});
    deleteSavedCardMutation.mutate(paymentMethodId);
  };

  return (
    <Card asChild>
      <section className='mt-6 p-4 sm:p-6'>
        <div className='mb-2 flex items-center justify-between gap-4'>
          <h2 className='text-xl font-semibold'>Payment cards</h2>

          <Button
            type='button'
            variant={isAdding ? 'outline' : 'default'}
            onClick={() => setIsAdding((current) => !current)}
            disabled={processingId === 'add'}
          >
            {isAdding ? <X aria-hidden='true' /> : <Plus aria-hidden='true' />}
            {isAdding ? 'Cancel' : 'Add card'}
          </Button>
        </div>

        <div className='space-y-4'>
          {isAdding && (
            <div className='rounded-lg border bg-muted/20 p-4'>
              <div className='rounded-md border bg-background p-3'>
                <CardElement options={{ hidePostalCode: true }} />
              </div>

              <div className='mt-4 flex justify-end'>
                <Button
                  type='button'
                  onClick={handleAddCard}
                  disabled={!stripe || processingId === 'add'}
                >
                  <Plus aria-hidden='true' />
                  Save card
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <p className='text-sm text-muted-foreground'>Loading cards</p>
          ) : !hasCards ? (
            <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
              No saved cards yet.
            </div>
          ) : (
            sortedCards.map((paymentMethod) => {
              const card = paymentMethod.card;
              const isDefault = paymentMethod.id === defaultPaymentMethodId;

              return (
                <div
                  key={paymentMethod.id}
                  className='flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div className='flex items-center gap-3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-md bg-muted'>
                      <CreditCard aria-hidden='true' />
                    </div>

                    <div>
                      <p className='font-medium'>
                        {card.brand.toUpperCase()} ending in {card.last4}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        Expires {card.exp_month}/{card.exp_year}
                      </p>
                    </div>
                  </div>

                  <div className='flex gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => handleSetDefault(paymentMethod.id)}
                      disabled={isDefault || processingId === paymentMethod.id}
                      aria-label={
                        isDefault ? 'Default card' : 'Set as default card'
                      }
                    >
                      <Star
                        aria-hidden='true'
                        className={
                          isDefault
                            ? 'fill-yellow-400 text-yellow-500'
                            : undefined
                        }
                      />
                      Default
                    </Button>

                    <Button
                      type='button'
                      variant='destructive'
                      onClick={() => handleDelete(paymentMethod.id)}
                      disabled={processingId === paymentMethod.id}
                    >
                      <Trash2 aria-hidden='true' />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
          {message && !isAlertClosed && (
            <AlertStatic title='Saved' onClose={() => setIsAlertClosed(true)}>
              {message}
            </AlertStatic>
          )}
          {errors.general && (
            <Alert variant='destructive'>
              <AlertTitle>Payment cards error</AlertTitle>
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}
        </div>
      </section>
    </Card>
  );
};
