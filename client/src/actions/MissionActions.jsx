import {
  publishMissionSchema,
  draftMissionSchema,
  searchMissionByTitleSchema,
} from '@hermyx/shared';

import { messages } from '@hermyx/shared';
import { createMission } from '../services/MissionsServices';

//New mission action, executed when form is sent
export const createMissionAction = async (previousState, formData) => {
  const fieldsData = Object.fromEntries(formData);
  const intent = formData.get('intent');

  let validatedFields;

  // Fields validation
  if (intent === 'draft') {
    validatedFields = draftMissionSchema.safeParse(fieldsData);
  } else {
    validatedFields = publishMissionSchema.safeParse(fieldsData);
  }

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    if (intent === 'draft') {
      const success = await createMission({
        ...validatedFields.data,
        status: 'draft',
      });

      if (!success) {
        throw { errors: { general: ['The mission could not be saved.'] } };
      }

      return { success: true, redirectUrl: null, data: null, errors: {} };
    }

    const success = await createMission({
      ...validatedFields.data,
      status: 'pending_payment',
    });

    if (!success?.mid) {
      throw {
        response: {
          status: 500,
          data: { message: messages.UNEXPECTED_ERROR },
        },
      };
    }

    if (!success) {
      throw {
        response: {
          status: 500,
          data: { message: messages.UNEXPECTED_ERROR },
        },
      };
    }

    //Success
    return {
      success: true,
      redirectTo: `/missions/${success.mid}/pay`,
      errors: {},
      data: null,
    };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Any other error
    const errorMessage =
      error.response?.data?.message || messages.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};

export const searchMissionByTitleAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = searchMissionByTitleSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  return { success: true, data: fieldsData, errors: {} };
};

export const paymentAction = async (extraParam, previousState, formData) => {
  console.log(extraParam, Object.fromEntries(formData));
  /*
  If (!stripe || !elements) {
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
        await api.post(`/stripe/missions/${missionId.trim()}/confirm-payment`, {
          paymentIntentId: result.paymentIntent.id,
        });

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
  }*/
};
