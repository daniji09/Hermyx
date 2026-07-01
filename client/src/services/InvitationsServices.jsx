import api from '../config/api';

export const createInvitation = async ({ missionId, receiverId, message }) => {
  const { data } = await api.post('/invitations', {
    missionId,
    receiverId,
    message,
  });

  return data;
};

export const getMyInvitations = async () => {
  const { data } = await api.get('/invitations/me');
  return data;
};

export const respondToInvitation = async ({ invitationId, response }) => {
  const { data } = await api.post(`/invitations/${invitationId}/respond`, {
    response,
  });
  return data;
};

export const markInvitationAsSeen = async (invitationId) => {
  const { data } = await api.post(`/invitations/${invitationId}/seen`);
  return data;
};
