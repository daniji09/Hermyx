import {
  publishMissionSchema,
  searchMissionByTitleSchema,
  addVacanciesSchema,
  editVacancySchema,
  editMissionBodySchema,
  messages,
} from '@hermyx/shared';
import { createMission, editMission } from '../services/ServiceServices';

// New service action, executed when the form is submitted

export const createMissionAction = async (previousState, formData) => {
  const fieldsData = Object.fromEntries(formData);

  // Photos are extracted
  const filesArray = formData.getAll('photos');

  // Array is formatted
  fieldsData.photos = filesArray
    .filter((file) => file instanceof File && file.size > 0)
    .map((file) => ({
      size: file.size,
      mimetype: file.type,
      file: file,
    }));

  // Fields validation
  const validatedFields = publishMissionSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    const success = await createMission({
      ...validatedFields.data,
    });

    if (!success?.mid) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    if (!success) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    //Success
    return {
      success: true,
      redirectTo: `/missions/${success.mid}`,
      errors: {},
      data: null,
    };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 409, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Any other error
    const errorMessage =
      error.response?.data?.message || messages.GENERAL.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};

// Edit service action, executed when the form is submitted
export const editMissionAction = async (previousState, formData) => {
  const fieldsData = Object.fromEntries(formData);

  // Photos are extracted
  const filesArray = formData.getAll('photos');

  // Array is formatted
  fieldsData.photos = filesArray
    .filter((file) => file instanceof File && file.size > 0)
    .map((file) => ({
      size: file.size,
      mimetype: file.type,
      file: file,
    }));
  const validatedFields = editMissionBodySchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    const success = await editMission({
      ...validatedFields.data,
    });
    console.log(success);
    if (!success?.mission?.mid) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    if (!success) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    //Success
    return {
      success: true,
      redirectTo: success.requiresExtraPayment
        ? `/missions/${success.mission.mid}/pay`
        : `/missions/${success.mission.mid}`,
      errors: {},
      data: null,
    };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 409, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Any other error
    const errorMessage =
      error.response?.data?.message || messages.GENERAL.UNEXPECTED_ERROR;

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

export const addVacanciesAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = addVacanciesSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  return { success: true, data: fieldsData, errors: {} };
};

export const editVacancyAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = editVacancySchema.safeParse(fieldsData);

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
    return addLog('Payment error', 'Stripe has not loaded yet.');
  }
  if (!missionId) return alert('Enter a service ID');

  try {
    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return addLog('Payment error', 'The card could not be read.');
    }

    // 1. Pedir PaymentIntent (Ruta: /pay/new)
    const { data } = await api.post('/stripe/pay/new', {
      missionId: missionId.trim(),
      saveCard: true,
    });

    if (data.error) return addLog('Payment backend error', data);

    // 2. Confirm the payment.
    const result = await stripe.confirmCardPayment(data.clientSecret, {
      payment_method: { card: cardElement },
    });

    if (result.error) addLog('Stripe payment error', result.error);
    else {
      // 3. Confirm the payment with the server.
      if (result.paymentIntent.status === 'succeeded') {
        await api.post(`/stripe/missions/${missionId.trim()}/confirm-payment`, {
          paymentIntentId: result.paymentIntent.id,
        });

        // 4. Set the card as the default if it was saved.
        await api.post('/stripe/cards/default', {
          paymentMethodId: result.paymentIntent.payment_method,
        });

        addLog('✅ PAYMENT COMPLETED', result.paymentIntent.payment_method);
        cardElement.clear(); // Clear the input.
      }
    }
  } catch (e) {
    addLog('New card payment error', getErrorData(e));
  }*/
};
