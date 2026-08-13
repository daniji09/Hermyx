import { messages } from '@hermyx/shared';
import * as missionPaymentModel from '../models/mission-payment.model.js';

export const createMissionPayment = async (paymentData, client) => {
  if (!paymentData)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Payment data'));
  return missionPaymentModel.create(paymentData, client);
};

export const getMissionPaymentsByVacancyId = async (vacancyId, client) =>
  missionPaymentModel.findByVacancyId(vacancyId, client);

export const refundMissionPayment = async (amount, paymentId, client) =>
  missionPaymentModel.refund(amount, paymentId, client);
