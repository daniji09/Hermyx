/*Import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import api from '../config/api';

const STRIPE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLIC_KEY;

const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const CardElementBox = ({ disabled }) => (
  <div
    style={{
      padding: '12px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      backgroundColor: '#ffffff',
      margin: '10px 0',
    }}
  >
    <CardElement
      options={{
        hidePostalCode: true,
        style: {
          base: {
            fontSize: '16px',
            color: '#32325d',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSmoothing: 'antialiased',
            '::placeholder': {
              color: '#aab7c4',
            },
          },
          invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
          },
        },
      }}
      disabled={disabled}
    />
  </div>
);

function MissionPayInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();

  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedPmId, setSelectedPmId] = useState('new');
  const [saveCard, setSaveCard] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === selectedPmId),
    [cards, selectedPmId],
  );

  const errMsg = (e, fallback) =>
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.message ||
    fallback;

  const fetchCards = useCallback(async () => {
    setLoadingCards(true);
    setError('');
    try {
      const { data } = await api.get('/stripe/cards');
      const fetchedCards = data?.cards || [];
      const defaultId = data?.defaultPaymentMethodId;

      const processedCards = fetchedCards.map((card) => ({
        ...card,
        isDefault: card.id === defaultId,
      }));

      setCards(processedCards);

      if (processedCards.length > 0) {
        const def =
          processedCards.find((c) => c.isDefault) || processedCards[0];
        setSelectedPmId(def.id);
      } else {
        setSelectedPmId('new');
      }
    } catch (e) {
      setError(errMsg(e, 'Error cargando tarjetas'));
    } finally {
      setLoadingCards(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [id, fetchCards]);

  const setDefaultCard = async (paymentMethodId) => {
    await api.post('/stripe/cards/default', { paymentMethodId });
  };

  const confirmMissionPayment = async (paymentIntentId) => {
    await api.post(`/stripe/missions/${id}/confirm-payment`, {
      paymentIntentId,
    });
  };

  const payWithNewCard = async () => {
    if (!stripe || !elements) throw new Error('Stripe no está listo todavía.');
    const cardEl = elements.getElement(CardElement);
    if (!cardEl) throw new Error('No se pudo leer la tarjeta.');

    const { data } = await api.post('/stripe/pay/new', {
      missionId: id.trim(),
      saveCard,
    });

    if (!data?.clientSecret)
      throw new Error('Backend no devolvió clientSecret.');

    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: { card: cardEl },
    });

    if (result.error) throw new Error(result.error.message || 'Pago fallido');

    const pi = result.paymentIntent;
    if (!pi?.id) throw new Error('No se recibió PaymentIntent.');
    if (pi.status !== 'succeeded')
      throw new Error(`El pago no se completó (${pi.status}).`);

    await confirmMissionPayment(pi.id);

    if (saveCard && pi.payment_method) {
      await setDefaultCard(pi.payment_method);
      await fetchCards();
    }
  };

  const payWithSavedCard = async () => {
    if (!stripe) throw new Error('Stripe no está listo todavía.');
    if (!selectedPmId || selectedPmId === 'new') {
      throw new Error('Selecciona una tarjeta guardada.');
    }

    if (selectedCard && !selectedCard.isDefault) {
      await setDefaultCard(selectedPmId);
      await fetchCards();
    }

    const { data } = await api.post('/stripe/pay/default', {
      missionId: id.trim(),
    });

    if (!data?.clientSecret)
      throw new Error('Backend no devolvió clientSecret.');
    if (!data?.paymentMethodId)
      throw new Error('Backend no devolvió paymentMethodId.');

    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: data.paymentMethodId,
    });

    if (result.error) throw new Error(result.error.message || 'Pago fallido');

    const pi = result.paymentIntent;
    if (!pi?.id) throw new Error('No se recibió PaymentIntent.');
    if (pi.status !== 'succeeded')
      throw new Error(`El pago no se completó (${pi.status}).`);

    await confirmMissionPayment(pi.id);
  };

  const handlePay = async () => {
    if (!id) {
      setError('Falta id en la URL.');
      return;
    }
    if (!STRIPE_KEY) {
      setError('Falta la clave pública de Stripe en el frontend.');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      if (selectedPmId === 'new') await payWithNewCard();
      else await payWithSavedCard();

      navigate('/');
    } catch (e) {
      setError(errMsg(e, 'Error de pago'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      <h1>Pagar y publicar misión</h1>

      {!STRIPE_KEY && (
        <div>
          Falta VITE_STRIPE_PUBLIC_KEY / VITE_STRIPE_PUBLISHABLE_KEY en el
          frontend.
        </div>
      )}

      {error && <div>{error}</div>}

      <div>
        <div>
          <h2>Método de pago</h2>

          {loadingCards ? (
            <p>Cargando tarjetas…</p>
          ) : (
            <div>
              {cards.map((c) => (
                <label
                  key={c.id}
                  style={{ display: 'block', marginBottom: '10px' }}
                >
                  <div>
                    <input
                      type='radio'
                      name='pm'
                      value={c.id}
                      checked={selectedPmId === c.id}
                      onChange={() => setSelectedPmId(c.id)}
                      disabled={processing}
                    />
                    <div
                      style={{ display: 'inline-block', marginLeft: '10px' }}
                    >
                      <div>
                        {c.card.brand.toUpperCase()} •••• {c.card.last4}
                        {c.isDefault ? (
                          <span
                            title='Tarjeta predeterminada'
                            style={{ marginLeft: '5px' }}
                          >
                            Por Defecto
                          </span>
                        ) : null}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Expira en {c.card.exp_month}/{c.card.exp_year}
                      </div>
                    </div>
                  </div>
                </label>
              ))}

              <label style={{ display: 'block', marginTop: '20px' }}>
                <div>
                  <input
                    type='radio'
                    name='pm'
                    value='new'
                    checked={selectedPmId === 'new'}
                    onChange={() => setSelectedPmId('new')}
                    disabled={processing}
                  />
                  <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                    ➕ Pagar con tarjeta nueva
                  </span>
                </div>

                {selectedPmId === 'new' && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginLeft: '25px', marginTop: '10px' }}
                  >
                    <CardElementBox disabled={processing || !STRIPE_KEY} />
                    <label>
                      <input
                        type='checkbox'
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        disabled={processing}
                      />
                      <span style={{ marginLeft: '5px', fontSize: '14px' }}>
                        Guardar esta tarjeta para próximos pagos
                      </span>
                    </label>
                  </div>
                )}
              </label>
            </div>
          )}
        </div>

        <button
          type='button'
          onClick={handlePay}
          disabled={processing || !STRIPE_KEY}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            cursor: processing ? 'not-allowed' : 'pointer',
          }}
        >
          {processing ? 'Procesando pago seguro…' : 'Pagar y publicar misión'}
        </button>
      </div>
    </div>
  );
}
*/
import { initialStateUseStateAction } from '../consts/consts.js';
import { useActionState, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { messages as sharedMessages } from '@hermyx/shared';

const STRIPE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = loadStripe(STRIPE_KEY || '');

export const Payment = () => {
  const { id } = useParams();

  return (
    <main className='flex min-h-screen items-center justify-center p-4'>
      <Elements stripe={stripePromise} options={{ locale: 'en' }}>
        <PaymentForm missionId={id} />
      </Elements>
    </main>
  );
};

const PaymentForm = ({ missionId }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  const [clearedFields, setClearedFields] = useState({});
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  // Payment workflow has to be orchestrated in an only component
  const [state, paymentFormAction, isPending] = useActionState(
    // eslint-disable-next-line no-unused-vars
    async (prevState, formData) => {
      // Initial validations
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
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          return {
            success: false,
            errors: { general: [messages.PAYMENT.CARD_NOT_READ] },
          };
        }

        // PaymentIntent is requested to backend
        const data = await saveNewCard(missionId);

        if (data.error) {
          return { success: false, errors: { general: [data.error] } };
        }

        // Confirm payment with Stripe
        const result = await stripe.confirmCardPayment(data.clientSecret, {
          payment_method: { card: cardElement },
        });

        if (result.error) {
          return {
            success: false,
            errors: { creditCard: [result.error.message] },
          };
        }

        // Confirm to server that payment was successful
        if (
          result.paymentIntent &&
          result.paymentIntent.status === 'succeeded'
        ) {
          await confirmPayment(missionId, result);

          // Establish card as default on server
          await establishCardAsDefault(result);

          return { success: true };
        }
        return {
          success: false,
          errors: { general: [sharedMessages.UNEXPECTED_ERROR] },
        };
      } catch (e) {
        return {
          success: false,
          errors: {
            general: [
              e?.response?.data?.message ||
                e.message ||
                sharedMessages.UNEXPECTED_ERROR,
            ],
          },
        };
      }
    },
    initialStateUseStateAction,
  );

  // Effect for navigating to home
  useEffect(() => {
    if (state?.success) navigate(`/missions/${missionId}`);
  }, [state?.success, missionId, navigate]);

  // Logic for cleaning errors in fields or alerts when modifications are done
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

  return (
    <div className='flex flex-col w-full max-w-155 gap-4'>
      <CardForm id='paymentForm' action={paymentFormAction}>
        <CardForm.Header>
          <CardForm.Title>{messages.PAYMENT.FORM_TITLE}</CardForm.Title>
        </CardForm.Header>

        <CardForm.Content legend='Application payment form.'>
          <FormCreditCardField
            id='paymentCard'
            label='Credit card (required):'
            error={activeCardError}
            invalid={isCardInvalid}
          />
        </CardForm.Content>

        <CardForm.Footer>
          <Button
            className='w-full'
            id='sendPayment'
            type='submit'
            form='paymentForm'
            disabled={isPending || !stripe}
          >
            {isPending ? 'Paying...' : 'Pay'}
          </Button>
        </CardForm.Footer>
      </CardForm>
      {state?.errors?.general && !isAlertClosed && (
        <FormAlert onClose={() => setIsAlertClosed(true)}>
          {state.errors.general[0]}
        </FormAlert>
      )}
    </div>
  );
};
