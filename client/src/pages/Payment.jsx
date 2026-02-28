import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
    e?.response?.data?.message || e?.message || fallback;

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
      missionId: id,
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
      missionId: id,
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

      navigate('/home');
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

export const Payment = () => {
  return (
    <Elements stripe={stripePromise}>
      <MissionPayInner />
    </Elements>
  );
};
