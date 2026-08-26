import api from '../config/api';

// Finds a service by id
export const saveNewCard = async (id) => {
  const { data } = await api.post(`/stripe/missions/${id.trim()}/pay/new`, {
    saveCard: true,
  });
  console.log(data);
  return data;
};

export const confirmPayment = async (id, result) => {
  await api.post(`/stripe/missions/${id.trim()}/confirm`, {
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
  const { data } = await api.post('/stripe/cards');
  return data;
};

export const setDefaultSavedCard = async (paymentMethodId) => {
  const { data } = await api.post('/stripe/cards/default', {
    paymentMethodId,
  });

  return data;
};

export const deleteSavedCard = async (paymentMethodId) => {
  const { data } = await api.delete(`/stripe/cards`, {
    data: { paymentMethodId },
  });
  return data;
};

export const connectOnBoard = async () => {
  const { data } = await api.post(`/stripe/connect/onboard`);
  return data;
};

export const goToDashboard = async () => {
  const { data } = await api.post(`/stripe/connect/dashboard-link`);
  return data;
};
