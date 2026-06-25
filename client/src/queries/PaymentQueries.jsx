import { queryOptions } from '@tanstack/react-query';
import {
  createCardSetupIntent,
  deleteSavedCard,
  getSavedCards,
  setDefaultSavedCard,
} from '../services/PaymentServices';

export const getSavedCardsQueryOptions = (options) => {
  return queryOptions({
    queryKey: ['getSavedCards'],
    queryFn: getSavedCards,
    ...options,
  });
};

export const createCardSetupIntentMutationOptions = (options) => {
  return {
    mutationFn: createCardSetupIntent,
    ...options,
  };
};

export const setDefaultSavedCardMutationOptions = (options) => {
  return {
    mutationFn: setDefaultSavedCard,
    ...options,
  };
};

export const deleteSavedCardMutationOptions = (options) => {
  return {
    mutationFn: deleteSavedCard,
    ...options,
  };
};
