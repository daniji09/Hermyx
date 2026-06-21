import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import api from '../config/api';

// --- DIAGNÓSTICO DE CLAVE ---
// Nota: Asegúrate de que en tu .env se llame igual que aquí (VITE_STRIPE_PUBLISHABLE_KEY o VITE_STRIPE_PUBLIC_KEY)
const STRIPE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLIC_KEY;

const stripePromise = loadStripe(STRIPE_KEY || '');
// Pasamos "" si es undefined para que no explote la app, pero avisaremos en pantalla.

const DashboardContent = () => {
  const stripe = useStripe();
  const elements = useElements();

  // Estado para inputs y logs
  const [missionId, setMissionId] = useState('');
  const [logs, setLogs] = useState([]);
  const [cards, setCards] = useState([]);

  // Función auxiliar para loguear en pantalla
  const addLog = (title, data) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${title}]`, data); // También a la consola del navegador
    setLogs((prev) => [
      `[${timestamp}] ${title}: ${JSON.stringify(data, null, 2)}`,
      ...prev,
    ]);
  };

  const getErrorData = (error) =>
    error?.response?.data || error?.message || 'Error desconocido';

  // --- ACCIONES DE CLIENTE ---

  const listarTarjetas = async () => {
    try {
      const { data } = await api.get('/stripe/cards');
      addLog('Listar Tarjetas', data);
      if (data.cards) setCards(data.cards);
    } catch (e) {
      addLog('ERROR RED', e.message);
    }
  };

  const guardarTarjeta = async () => {
    if (!stripe || !elements) {
      return addLog(
        'Error',
        'Stripe no ha cargado todavía. ¿Tienes la clave pública bien puesta?',
      );
    }

    // 1. Validar que el usuario escribió algo
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    addLog('Iniciando guardado...', 'Solicitando SetupIntent...');

    // 2. Pedir SetupIntent al Backend
    try {
      const { data: dataSetup } = await api.post(
        '/stripe/add-card-to-customer',
      );

      if (dataSetup.error) return addLog('Error Backend Setup', dataSetup);

      // 3. Confirmar con Stripe (Frontend)
      const result = await stripe.confirmCardSetup(dataSetup.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: 'Tester TFG' },
        },
      });

      if (result.error) {
        addLog('Error Stripe', result.error);
      } else {
        const pmId = result.setupIntent.payment_method;
        addLog('✅ Tarjeta Guardada', pmId);

        // 3. PASO EXTRA: Decirle al backend que esta sea la Default
        addLog('🔄 Estableciendo como predeterminada...', pmId);

        await api.post('/stripe/cards/default', { paymentMethodId: pmId });

        addLog('⭐ ¡Tarjeta establecida como Default!', pmId);

        // Esperamos un poco para que a Stripe le de tiempo a actualizarse
        setTimeout(() => {
          listarTarjetas();
        }, 1000);

        cardElement.clear(); // Limpiar el input
      }
    } catch (e) {
      addLog('ERROR CRÍTICO', e.message);
    }
  };

  // --- NUEVA FUNCIÓN: BORRAR TARJETA ---
  const borrarTarjeta = async (paymentMethodId) => {
    // 1. Preguntar confirmación para no borrar por error
    if (!window.confirm('¿Seguro que quieres eliminar esta tarjeta?')) return;

    addLog('🗑️ Borrando tarjeta...', paymentMethodId);

    try {
      // 2. Llamar al Backend (Ruta: DELETE /cards/:id)
      const { data } = await api.delete(`/stripe/cards/${paymentMethodId}`);

      if (data.error) {
        addLog('Error al borrar', data);
      } else {
        addLog('✅ Tarjeta eliminada', data.message);
        // 3. Actualizar la lista visualmente
        listarTarjetas();
      }
    } catch (e) {
      addLog('Error de Red', e.message);
    }
  };

  const pagarMisionNueva = async () => {
    if (!stripe || !elements) {
      return addLog('Error Pago', 'Stripe no ha cargado todavia.');
    }
    if (!missionId) return alert('Pon un ID de misión');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        return addLog('Error Pago', 'No se pudo leer la tarjeta.');
      }

      // 1. Pedir PaymentIntent (Ruta: /pay/new)
      const { data } = await api.post('/stripe/pay/new', {
        missionId: missionId.trim(),
        saveCard: true,
      });

      if (data.error) return addLog('Error Backend Pago', data);

      // 2. Confirmar Pago
      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: { card: cardElement },
      });

      if (result.error) addLog('Error Pago Stripe', result.error);
      else {
        // 3. Confirmar al servidor (Ruta: /missions/:id/confirm-payment)
        if (result.paymentIntent.status === 'succeeded') {
          await api.post(
            `/stripe/missions/${missionId.trim()}/confirm-payment`,
            {
              paymentIntentId: result.paymentIntent.id,
            },
          );

          // 4. Establecer tarjeta como default si se guardó
          await api.post('/stripe/cards/default', {
            paymentMethodId: result.paymentIntent.payment_method,
          });

          addLog('✅ PAGO COMPLETADO', result.paymentIntent.payment_method);
          cardElement.clear(); // Limpiar el input
        }
      }
    } catch (e) {
      addLog('Error Pago Nueva Tarjeta', getErrorData(e));
    }
  };

  const pagarMisionDefault = async () => {
    if (!missionId) return alert('Pon un ID de misión');
    try {
      const { data } = await api.post('/stripe/pay/default', { missionId });

      if (data.error) return addLog('Error Pago Default', data);

      const result = await stripe.confirmCardPayment(data.clientSecret, {
        payment_method: data.paymentMethodId,
      });

      if (result.error) {
        // Si falla o pide 3DS y falla, sale por aquí
        addLog('❌ Error al confirmar tarjeta guardada', result.error);
      } else {
        // 3. Si todo fue bien, avisamos al backend para poner 'funded'
        if (result.paymentIntent.status === 'succeeded') {
          await api.post(`/stripe/missions/${missionId}/confirm-payment`, {
            paymentIntentId: result.paymentIntent.id,
          });
          addLog('✅ PAGO DEFAULT COMPLETADO', result.paymentIntent);
        }
      }
    } catch (e) {
      addLog('Error Red Default', e.message);
    }
  };

  // --- ACCIONES DE SISTEMA / ADMIN ---

  const liberarDinero = async () => {
    if (!missionId) return alert('Pon un ID de misión');
    const { data } = await api.post(`/stripe/missions/${missionId}/release`);
    addLog('Liberar Pago', data);
  };

  const reembolsar = async () => {
    if (!missionId) return alert('Pon un ID de misión');
    const { data } = await api.post(`/stripe/missions/${missionId}/refund`);
    addLog('Reembolso', data);
  };

  const verMiCuentaStripe = async () => {
    addLog('🔐 Obteniendo acceso...', 'Solicitando Login Link a Stripe...');
    try {
      const { data } = await api.post('/stripe/connect/login-link');
      /*
        'http://localhost:3000/stripe/connect/login-link',
        {
          method: 'POST',
          // Si usas tokens de auth, añádelos aquí en headers:
          // Headers: { "Authorization": `Bearer ${token}` }
        },
      );
      const data = await res.json();
      */

      if (data.error) {
        addLog('❌ Error Acceso Dashboard', data.error);
        alert(data.error);
      } else {
        addLog('✅ Redirigiendo al Dashboard...', data.url);
        // Abrir en pestaña nueva
        window.open(data.url, '_blank');
      }
    } catch (e) {
      addLog('Error de Red', e.message);
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-100 min-h-screen'>
      {/* COLUMNA IZQUIERDA: CONTROLES */}
      <div className='space-y-6'>
        {/* 1. CLIENTE & TARJETAS */}
        <div className='bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-500'>
          <h2 className='font-bold text-2xl mb-4 text-gray-800 flex items-center'>
            👤 Billetera Cliente
          </h2>

          <button
            onClick={listarTarjetas}
            className='mb-4 bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded text-blue-800 font-bold w-full transition'
          >
            📋 Listar Mis Tarjetas
          </button>

          {/* --- ZONA DE TARJETA --- */}
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Nueva Tarjeta (Prueba: 4242...)
          </label>

          {/* ESTILOS FORZADOS PARA QUE SE VEA SI O SI */}
          <div className='border border-gray-300 p-4 rounded bg-white mb-4 shadow-inner'>
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: '18px',
                    color: '#424770',
                    '::placeholder': { color: '#aab7c4' },
                  },
                  invalid: { color: '#9e2146' },
                },
              }}
            />
          </div>

          <button
            onClick={guardarTarjeta}
            className='w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition shadow-lg'
          >
            💾 Guardar esta Tarjeta
          </button>

          {/* LISTA DE TARJETAS CON BOTÓN ELIMINAR */}
          <div className='mt-4 space-y-2'>
            {cards.length === 0 && (
              <p className='text-gray-400 text-sm italic text-center py-2'>
                No hay tarjetas guardadas.
              </p>
            )}

            {cards.map((c) => (
              <div
                key={c.id}
                className='flex items-center justify-between bg-gray-50 p-3 rounded border text-sm hover:bg-gray-100 transition'
              >
                <div className='flex flex-col'>
                  <span className='font-bold text-gray-700 flex items-center gap-2'>
                    💳 {c.card.brand.toUpperCase()} **** {c.card.last4}
                  </span>
                  <span className='text-gray-500 text-xs font-mono'>
                    {c.id}
                  </span>
                </div>

                <button
                  onClick={() => borrarTarjeta(c.id)}
                  className='text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1 rounded transition font-bold border border-transparent hover:border-red-200 flex items-center gap-1'
                  title='Eliminar tarjeta'
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 2. OPERACIONES DE MISIÓN */}
        <div className='bg-white p-6 rounded-lg shadow-md border-t-4 border-green-500'>
          <h2 className='font-bold text-2xl mb-4 text-gray-800'>
            💸 Misiones y Pagos
          </h2>
          <input
            type='text'
            placeholder='ID Misión (ej: 15)'
            value={missionId}
            onChange={(e) => setMissionId(e.target.value)}
            className='w-full border-2 border-gray-300 p-3 rounded-lg mb-4 focus:border-green-500 outline-none'
          />

          <div className='grid grid-cols-2 gap-3'>
            <button
              onClick={pagarMisionNueva}
              className='bg-green-600 text-white py-2 rounded font-bold hover:bg-green-700'
            >
              Pagar (Nueva Tarjeta)
            </button>
            <button
              onClick={pagarMisionDefault}
              className='bg-green-800 text-white py-2 rounded font-bold hover:bg-green-900'
            >
              Pagar (Tarjeta Default)
            </button>

            <button
              onClick={liberarDinero}
              className='bg-yellow-500 text-white py-2 rounded font-bold hover:bg-yellow-600'
            >
              🤝 Liberar (Payout)
            </button>
            <button
              onClick={reembolsar}
              className='bg-red-500 text-white py-2 rounded font-bold hover:bg-red-600'
            >
              ↩️ Reembolsar
            </button>
          </div>
        </div>

        {/* 3. AVENTURERO (MODIFICADO) */}
        <div className='bg-white p-6 rounded-lg shadow-md border-t-4 border-purple-500'>
          <h2 className='font-bold text-xl mb-3 text-purple-700'>
            ⚔️ Soy Aventurero (Quiero Cobrar)
          </h2>
          <p className='text-sm text-gray-600 mb-4'>
            Para recibir el dinero de las misiones, necesitas vincular tu cuenta
            bancaria con Stripe.
          </p>

          <div className='flex flex-col gap-3'>
            {/* BOTÓN PRINCIPAL DE REGISTRO */}
            <button
              onClick={() => {
                // Redirigimos al navegador ENTERO al endpoint del backend
                // No usamos fetch() porque el backend hace un res.redirect()
                window.location.href =
                  'http://localhost:3000/stripe/connect/onboard';
              }}
              className='w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow transition flex justify-center items-center gap-2'
            >
              <span>🏦</span> Conectar cuenta de Stripe
            </button>

            {/* Link de ayuda para ver el resultado */}
            <div className='text-center text-xs text-gray-400 mt-2'>
              ⬇️ Rutas de depuración ⬇️
            </div>

            <div className='flex gap-2'>
              <a
                href='http://localhost:3000/stripe/connect/success'
                target='_blank'
                rel='noreferrer'
                className='flex-1 text-center bg-gray-100 text-gray-600 py-1 rounded border text-xs'
              >
                Simular Success
              </a>
              <button
                onClick={verMiCuentaStripe}
                className='flex-1 text-center bg-blue-50 text-blue-600 py-1 rounded border border-blue-200 text-xs font-bold hover:bg-blue-100'
              >
                Ver MI Cuenta (Express)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMNA DERECHA: LOGS */}
      <div className='bg-gray-900 text-green-400 p-4 rounded-lg shadow-xl font-mono text-xs md:text-sm h-screen overflow-auto border border-gray-700'>
        <h3 className='border-b border-gray-700 pb-2 mb-2 font-bold text-white text-lg'>
          🖥️ Consola de Eventos
        </h3>

        {!STRIPE_KEY && (
          <div className='bg-red-600 text-white p-2 mb-4 font-bold rounded animate-pulse'>
            ⚠️ ERROR: No se ha detectado VITE_STRIPE_PUBLIC_KEY. Revisa tu
            archivo .env en la carpeta del Frontend.
          </div>
        )}

        {logs.length === 0 && (
          <p className='opacity-50'>Esperando acciones...</p>
        )}
        {logs.map((log, i) => (
          <div
            key={i}
            className='mb-2 border-b border-gray-800 pb-1 break-words'
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function TestDashboard() {
  return (
    <Elements stripe={stripePromise}>
      <DashboardContent />
    </Elements>
  );
}
