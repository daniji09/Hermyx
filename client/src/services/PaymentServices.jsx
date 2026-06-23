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

export const getSavedCards = async () => {
  const { data } = await api.get('/stripe/cards');
  return data;
};

export const createCardSetupIntent = async () => {
  const { data } = await api.post('/stripe/add-card-to-customer');
  return data;
};

export const setDefaultSavedCard = async (paymentMethodId) => {
  const { data } = await api.post('/stripe/cards/default', {
    paymentMethodId,
  });

  return data;
};

export const deleteSavedCard = async (paymentMethodId) => {
  const { data } = await api.delete(`/stripe/cards/${paymentMethodId}`);
  return data;
};
