import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import {
  CreditCard,
  Info,
  Plus,
  Star,
  Trash2,
  SquareArrowOutUpRight,
  X,
} from 'lucide-react';
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
import { useAlert } from '../../contexts/AlertContext';
import { messages } from '../../messages/messages';
import { messages as messagesShared } from '@hermyx/shared';
import { connectOnBoard, goToDashboard } from '../../services/PaymentServices';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const emptyCards = [];

export const StripeManagement = ({ user }) => {
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
      <section id='payment-settings' className='p-4 sm:p-6 mt-6'>
        <h2 className='text-2xl font-bold tracking-tight pb-2 border-b'>
          Payment settings
        </h2>
        <div className='flex flex-col gap-y-2'>
          <h3 className='text-lg font-medium'>Payout methods</h3>
          <div className='flex flex-col md:flex-row md:items-center justify-between'>
            <p className='text-sm'>
              {user.bank_account.isConfigured
                ? `Your earnings will be sent automatically to your ${user.bank_account.bankName} account ending in •••• ${user.bank_account.last4}.`
                : `Set up your bank account to receive payouts for the services you complete.`}
            </p>
            <div className='mt-2 md:mt-0'>
              <AddBankAccountButton user={user}></AddBankAccountButton>
            </div>
          </div>

          <h3 className='text-lg mt-3 font-medium'>Payment cards</h3>
          <div className='flex flex-col md:flex-row md:items-center justify-between mb-1'>
            <p>
              Add a credit or debit card to fund your services and pay
              collaborators.
            </p>
            <div className='mt-2 md:mt-0'>
              <Button
                type='button'
                variant={isAdding ? 'outline' : 'default'}
                onClick={() => setIsAdding((current) => !current)}
                disabled={processingId === 'add'}
              >
                {isAdding ? (
                  <X className='w-4 h-4' aria-hidden='true' />
                ) : (
                  <Plus className='w-4 h-4' aria-hidden='true' />
                )}
                {isAdding ? 'Cancel' : 'Add card'}
              </Button>
            </div>
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
                    <Plus className='w-4 h-4' aria-hidden='true' />
                    Save card
                  </Button>
                </div>
              </div>
            )}
            {isLoading ? (
              <p className='text-sm text-muted-foreground'>Loading cards...</p>
            ) : !hasCards ? (
              <div className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
                No saved cards yet.
              </div>
            ) : (
              <>
                <div className='space-y-4'>
                  {sortedCards.slice(0, 3).map((paymentMethod) => (
                    <PaymentCardRow
                      key={paymentMethod.id}
                      paymentMethod={paymentMethod}
                      isDefault={paymentMethod.id === defaultPaymentMethodId}
                      isProcessing={processingId === paymentMethod.id}
                      onSetDefault={handleSetDefault}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>

                {sortedCards.length > 3 && (
                  <div>
                    <div className='flex justify-center pt-2'>
                      <AllCardsDialog
                        cards={sortedCards}
                        defaultPaymentMethodId={defaultPaymentMethodId}
                        processingId={processingId}
                        handleSetDefault={handleSetDefault}
                        handleDelete={handleDelete}
                      />
                    </div>

                    <div className='flex items-center justify-end me-3 mt-2'>
                      <Info className='w-4 h-4 mr-1' aria-hidden='true' />
                      <small>
                        Only showing 3 of your cards, click &quot;See all&quot;
                        to view them all!
                      </small>
                    </div>
                  </div>
                )}
              </>
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
        </div>
      </section>
    </Card>
  );
};

const AddBankAccountButton = ({ user }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const hasStripeProvider = user.stripe_connected_id !== null;

  const { isPending: isPendingDashboard, mutate: mutateDashboard } =
    useMutation({
      mutationFn: () => goToDashboard(),
      onSuccess: (data) => {
        queryClient.invalidateQueries(['getMyProfile']);
        window.open(data.url, '_blank', 'noopener,noreferrer');
      },
      // Backend error handling
      onError: (error) => {
        if (error?.isPopupCancel) {
          return;
        }
        showAlert({
          title: messages.MY_PROFILE.DASHBOARD_ACCOUNT_ALERT.ERROR_TITLE,
          description:
            error?.response?.data?.errors?.general?.[0] ||
            messagesShared.GENERAL.UNEXPECTED_ERROR,
        });
      },
    });

  const { isPending: isPendingLink, mutate: mutateLink } = useMutation({
    mutationFn: () => connectOnBoard(),

    onSuccess: (data) => {
      queryClient.invalidateQueries(['getMyProfile']);
      window.location.href = data.url;
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MY_PROFILE.ADD_BANK_ACCOUNT_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  const handleAttempt = () => {
    if (hasStripeProvider && user.bank_account.isConfigured) {
      mutateDashboard();
    } else {
      mutateLink();
    }
  };

  return (
    <Button
      type='button'
      id='addBankAccountButton'
      onClick={handleAttempt}
      disabled={isPendingLink || isPendingDashboard}
    >
      <SquareArrowOutUpRight className='h-4 w-4 mr-2' aria-hidden='true' />
      {hasStripeProvider && user.bank_account.isConfigured
        ? 'My earnings'
        : 'Add account'}
    </Button>
  );
};

const AllCardsDialog = ({
  cards,
  defaultPaymentMethodId,
  processingId,
  handleSetDefault,
  handleDelete,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='w-full sm:w-auto mt-2 sm:mt-0'
        >
          See all cards ({cards.length})
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-xl flex flex-col gap-0 max-h-[80vh] p-3 overflow-hidden'>
        <DialogHeader className='px-6 py-4 border-b shrink-0'>
          <DialogTitle>All payment cards</DialogTitle>
          <DialogDescription>
            Manage your saved credit and debit cards.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-muted/10'>
          {cards.map((paymentMethod) => (
            <PaymentCardRow
              key={paymentMethod.id}
              paymentMethod={paymentMethod}
              isDefault={paymentMethod.id === defaultPaymentMethodId}
              isProcessing={processingId === paymentMethod.id}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
            />
          ))}
        </div>

        <DialogFooter className='px-6 py-4 border-t shrink-0'>
          <DialogClose asChild>
            <Button variant='outline' type='button'>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PaymentCardRow = ({
  paymentMethod,
  isDefault,
  isProcessing,
  onSetDefault,
  onDelete,
}) => {
  const card = paymentMethod.card;

  return (
    <div className='flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between bg-card'>
      <div className='flex items-center gap-3'>
        <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted'>
          <CreditCard className='w-4 h-4' aria-hidden='true' />
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

      <div className='flex flex-col gap-y-2 sm:gap-2 sm:gap-y-0 sm:flex-row sm:items-center justify-between '>
        <Button
          type='button'
          variant='outline'
          onClick={() => onSetDefault(paymentMethod.id)}
          disabled={isDefault || isProcessing}
          aria-label={isDefault ? 'Default card' : 'Set as default card'}
        >
          <Star
            aria-hidden='true'
            className={
              isDefault ? 'fill-yellow-400 text-yellow-500 w-4 h-4' : 'w-4 h-4'
            }
          />
          Default
        </Button>
        <Button
          type='button'
          variant='destructive'
          onClick={() => onDelete(paymentMethod.id)}
          disabled={isProcessing}
        >
          <Trash2 className='w-4 h-4' aria-hidden='true' />
          Delete
        </Button>
      </div>
    </div>
  );
};
