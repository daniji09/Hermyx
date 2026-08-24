import { initialStateUseStateAction } from '../consts/consts.js';
import { useActionState, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CardForm } from '../components/custom/form/CardForm.jsx';
import { FormAlert } from '../components/custom/form/FormAlert.jsx';
import { messages } from '../messages/messages.js';
import {
  Elements,
  useStripe,
  useElements,
  CardElement,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { FormCreditCardField } from '../components/custom/form/FormCreditCardField.jsx';
import {
  confirmPayment,
  establishCardAsDefault,
  saveNewCard,
} from '../services/PaymentServices.jsx';
import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import {
  HERMYX_FEE,
  MISSION_STATUS,
  messages as sharedMessages,
} from '@hermyx/shared';
import { useQuery } from '@tanstack/react-query';
import { getMissionPaymentInfoByIdQueryOptions } from '../queries/MissionsQueries.jsx';
import { BanknoteArrowUp } from 'lucide-react';
import { getSavedCardsQueryOptions } from '../queries/PaymentQueries.jsx';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/Checkbox';
import { NotFound } from './NotFound.jsx';

const STRIPE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = loadStripe(STRIPE_KEY || '');

export const Payment = () => {
  const { id } = useParams();

  // Query options
  const enabledOption = !!id;
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data: missionPaymentInfo,
    isLoading,
    isError,
  } = useQuery(
    getMissionPaymentInfoByIdQueryOptions(id, {
      enabled: enabledOption,
      retry: retryOption,
    }),
  );

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data: cardsInfo,
    isLoadingCards,
    isErrorCards,
  } = useQuery(
    getSavedCardsQueryOptions({
      enabled: enabledOption,
      retry: retryOption,
    }),
  );

  if (isLoading || isLoadingCards) {
    return (
      <main className='container mx-auto max-w-6xl p-4 sm:p-6'>
        <div role='status' className='p-8 text-center text-muted-foreground'>
          Loading mission payment...
        </div>
      </main>
    );
  }

  if (isError || isErrorCards || !missionPaymentInfo) {
    return <NotFound></NotFound>;
  }

  if (missionPaymentInfo.missionPayment.length === 0) {
    return (
      <Navigate to={`/missions/${missionPaymentInfo.mission.mid}`} replace />
    );
  }

  return (
    <main className='container mx-auto max-w-6xl sm:p-6 flex justify-center p-4'>
      <Elements stripe={stripePromise} options={{ locale: 'en' }}>
        <PaymentForm
          missionId={id}
          mission={missionPaymentInfo?.mission}
          missionPaymentInfo={missionPaymentInfo?.missionPayment}
          cardsInfo={cardsInfo}
        />
      </Elements>
    </main>
  );
};

const PaymentForm = ({ missionId, mission, missionPaymentInfo, cardsInfo }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [clearedFields, setClearedFields] = useState({});
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    cardsInfo?.defaultPaymentMethodId || 'new',
  );

  const [state, paymentFormAction, isPending] = useActionState(
    async (prevState, formData) => {
      if (!stripe || !elements) {
        return {
          success: false,
          errors: { general: [messages.PAYMENT.STRIPE_NOT_LOADED] },
        };
      }
      if (!missionId) {
        return {
          success: false,
          errors: { general: [messages.PAYMENT.MISSION_NOT_FOUND] },
        };
      }

      try {
        const paymentMethodId = formData.get('paymentMethodId');
        const saveAsDefault = formData.get('saveAsDefault') === 'true';

        const data = await saveNewCard(missionId);
        if (data.error) {
          return { success: false, errors: { general: [data.error] } };
        }

        let confirmParams = {};

        if (paymentMethodId && paymentMethodId !== 'new') {
          confirmParams = { payment_method: paymentMethodId };
        } else {
          const cardElement = elements.getElement(CardElement);
          if (!cardElement) {
            return {
              success: false,
              errors: { general: [messages.PAYMENT.CARD_NOT_READ] },
            };
          }
          confirmParams = { payment_method: { card: cardElement } };
        }

        const result = await stripe.confirmCardPayment(
          data.clientSecret,
          confirmParams,
        );

        if (result.error) {
          return {
            success: false,
            errors: { general: [result.error.message] },
          };
        }

        if (
          result.paymentIntent &&
          result.paymentIntent.status === 'succeeded'
        ) {
          await confirmPayment(missionId, result);
          if (saveAsDefault) {
            await establishCardAsDefault(result);
          }
          return { success: true };
        }

        return {
          success: false,
          errors: { general: [sharedMessages.GENERAL.UNEXPECTED_ERROR] },
        };
      } catch (e) {
        console.log(e.response.data.errors.general[0]);
        return {
          success: false,
          errors: {
            general: [
              e?.response?.data?.errors?.general?.[0] ||
                e?.response?.data?.message ||
                e?.message ||
                sharedMessages.GENERAL.UNEXPECTED_ERROR,
            ],
          },
        };
      }
    },
    initialStateUseStateAction,
  );

  useEffect(() => {
    if (state?.success) navigate(`/missions/${missionId}`);
  }, [state?.success, missionId, navigate]);

  const [prevServerState, setPrevServerState] = useState(state);
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
  }

  const isCardCleared = clearedFields.creditCard;
  const activeCardError =
    !isCardCleared && state?.errors?.creditCard
      ? state.errors.creditCard[0]
      : undefined;
  const isCardInvalid = !isCardCleared && !!state?.errors?.creditCard;

  const groupedPayments = [];
  const groupsMap = {};

  (missionPaymentInfo || []).forEach((payment) => {
    const title = payment.title || 'Adventurer';
    const amountPaid = Number(payment.amount_paid || 0);
    const totalReward = Number(payment.monetary_reward || 0);
    const rewardToPay = totalReward - amountPaid;
    if (rewardToPay <= 0) return;

    const isRewardEdition = amountPaid > 0;
    const isMissionFunding = mission?.status === MISSION_STATUS.CLOSED.ID;

    const paymentType = isRewardEdition
      ? 'Reward adjustment'
      : isMissionFunding
        ? 'Initial deposit'
        : 'New adventurer deposit';

    const key = `${title}_${paymentType}_${rewardToPay}`;

    if (groupsMap[key]) {
      groupsMap[key].quantity += 1;
      groupsMap[key].lineTotal += rewardToPay;
    } else {
      groupsMap[key] = {
        id: payment.id,
        title,
        paymentType,
        unitPrice: rewardToPay,
        quantity: 1,
        lineTotal: rewardToPay,
      };
      groupedPayments.push(groupsMap[key]);
    }
  });

  const subtotal = groupedPayments.reduce(
    (acc, item) => acc + item.lineTotal,
    0,
  );
  const hermyxFee = subtotal * HERMYX_FEE - subtotal; // 10% fee
  const totalDue = subtotal + hermyxFee;

  const formatCurrency = (value) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(Number(value || 0));

  const handleRadioKeyDown = (e, value) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedPaymentMethod(value);
    }
  };

  return (
    <div className='flex flex-col w-full max-w-6xl gap-4'>
      <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
        <div className='flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <BanknoteArrowUp className='h-6 w-6' aria-hidden='true' />
          </span>
          <div className='min-w-0 flex-1'>
            <h1 className='text-3xl sm:text-4xl font-bold tracking-tight min-w-0 wrap-break-words wrap-anywhere'>
              Mission payment
            </h1>
            <p className='text-muted-foreground mt-1'>
              Pay all participations that are needed.
            </p>
          </div>
        </div>
      </section>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
        <div className='flex flex-col'>
          <Card className='h-fit border-primary/20 shadow-sm'>
            <CardHeader className='pb-4 border-b bg-muted/20'>
              <CardTitle className='min-w-0 wrap-break-words wrap-anywhere text-3xl'>
                <Link
                  to={`/missions/${missionId}`}
                  className='hover:text-primary hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm'
                  title='Go back to mission details'
                >
                  {mission?.title}
                </Link>
              </CardTitle>
              <CardDescription>Order Summary</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className='space-y-5  ' aria-label='Payment breakdown'>
                {groupedPayments.map((item) => (
                  <li
                    key={item.id}
                    className='flex justify-between items-start gap-4'
                  >
                    <div className='flex flex-col min-w-0 flex-1'>
                      <span className='font-lg text-lg text-foreground wrap-break-words'>
                        <span className='text-muted-foreground mr-2 font-normal'>
                          x{item.quantity}
                        </span>
                        {item.title}
                      </span>
                      <div className='flex flex-wrap gap-2 items-center italic -mt-0.5'>
                        {item.paymentType}

                        {item.quantity > 1 && (
                          <span className='text-xs text-muted-foreground'>
                            ({formatCurrency(item.unitPrice)} each)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className='font-semibold shrink-0 tabular-nums m-1'>
                      {formatCurrency(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>

              <div
                className='space-y-2 my-4 border-t pt-4'
                aria-label='Totals breakdown'
              >
                <div className='flex justify-between items-center text-sm text-muted-foreground'>
                  <span>Subtotal</span>
                  <span className='tabular-nums font-semibold'>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className='flex justify-between items-center text-sm text-muted-foreground'>
                  <span>Hermyx Service Fee (10%)</span>
                  <span className='tabular-nums font-semibold'>
                    {formatCurrency(hermyxFee)}
                  </span>
                </div>
              </div>

              <div className='flex justify-between items-center w-full pt-3 border-t'>
                <span className='text-lg font-bold text-foreground'>
                  Total due
                </span>
                <span className='text-2xl font-bold text-primary tabular-nums'>
                  {formatCurrency(totalDue)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <CardForm id='paymentForm' action={paymentFormAction}>
            <CardForm.Header>
              <CardForm.Title>{messages.PAYMENT.FORM_TITLE}</CardForm.Title>
            </CardForm.Header>

            <CardForm.Content legend='Application payment form.'>
              <input
                type='hidden'
                name='paymentMethodId'
                value={selectedPaymentMethod}
              />

              <div className='space-y-4'>
                {cardsInfo?.cards?.length > 0 && (
                  <div className='space-y-3'>
                    <Label
                      id='payment-methods-label'
                      className='text-muted-foreground'
                    >
                      Saved payment methods
                    </Label>

                    <div
                      className='grid gap-2'
                      role='radiogroup'
                      aria-labelledby='payment-methods-label'
                    >
                      {cardsInfo.cards.map((pm) => (
                        <div
                          key={pm.id}
                          role='radio'
                          aria-checked={selectedPaymentMethod === pm.id}
                          tabIndex={0}
                          onClick={() => setSelectedPaymentMethod(pm.id)}
                          onKeyDown={(e) => handleRadioKeyDown(e, pm.id)}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                            selectedPaymentMethod === pm.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:border-primary/50 bg-card'
                          }`}
                        >
                          <div className='flex items-center gap-3'>
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPaymentMethod === pm.id ? 'border-primary' : 'border-muted-foreground'}`}
                              aria-hidden='true'
                            >
                              {selectedPaymentMethod === pm.id && (
                                <div className='h-2 w-2 rounded-full bg-primary' />
                              )}
                            </div>
                            <span className='font-medium capitalize text-sm'>
                              {pm.card.brand} •••• {pm.card.last4}
                            </span>
                            <p className='text-xs text-muted-foreground'>
                              {String(pm.card.exp_month).padStart(2, '0')}/
                              {String(pm.card.exp_year).slice(-2)}
                            </p>
                          </div>
                          {cardsInfo.defaultPaymentMethodId === pm.id && (
                            <p className='italic text-sm text-muted-foreground'>
                              Default
                            </p>
                          )}
                        </div>
                      ))}

                      <div
                        role='radio'
                        aria-checked={selectedPaymentMethod === 'new'}
                        tabIndex={0}
                        onClick={() => setSelectedPaymentMethod('new')}
                        onKeyDown={(e) => handleRadioKeyDown(e, 'new')}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                          selectedPaymentMethod === 'new'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:border-primary/50 bg-card'
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedPaymentMethod === 'new' ? 'border-primary' : 'border-muted-foreground'}`}
                          aria-hidden='true'
                        >
                          {selectedPaymentMethod === 'new' && (
                            <div className='h-2 w-2 rounded-full bg-primary' />
                          )}
                        </div>
                        <span className='font-medium text-sm'>
                          Use a new credit card
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedPaymentMethod === 'new' && (
                  <div className='pt-2 animate-in fade-in slide-in-from-top-2 duration-300'>
                    <FormCreditCardField
                      id='paymentCard'
                      label={
                        cardsInfo?.cards?.length > 0
                          ? 'Card details:'
                          : 'Credit card (required):'
                      }
                      error={activeCardError}
                      invalid={isCardInvalid}
                    />

                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='saveAsDefault'
                        name='saveAsDefault'
                        value='true'
                        defaultChecked={true}
                      />
                      <Label
                        htmlFor='saveAsDefault'
                        className='text-sm font-normal text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                      >
                        Save as my default payment method
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </CardForm.Content>

            <CardForm.Footer>
              <Button
                className='w-full'
                id='sendPayment'
                type='submit'
                form='paymentForm'
                disabled={
                  isPending || (!stripe && selectedPaymentMethod === 'new')
                }
              >
                {isPending
                  ? 'Processing payment...'
                  : `Pay ${formatCurrency(totalDue)}`}
              </Button>
            </CardForm.Footer>
          </CardForm>

          {state?.errors?.general && !isAlertClosed && (
            <div className='mt-4'>
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
