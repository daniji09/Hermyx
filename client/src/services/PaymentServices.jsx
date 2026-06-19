import api from '../config/api';

// Finds mission by id
export const saveNewCard = async (id) => {
  const { data } = await api.post('/stripe/pay/new', {
    missionId: id.trim(),
    saveCard: true,
  });

  return data;
};

export const confirmPayment = async (id, result) => {
  await api.post(`/stripe/missions/${id.trim()}/confirm-payment`, {
    paymentIntentId: result.paymentIntent.id,
  });
};

export const establishCardAsDefault = async (result) => {
  await api.post('/stripe/cards/default', {
    paymentMethodId: result.paymentIntent.payment_method,
  });
};
