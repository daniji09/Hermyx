// Date formatters
export const timestampToDayMonthYear = (timestamp) => {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Format last message to time today or date
export const formatLastMessageTime = (timestamp) => {
  if (!timestamp) return '';

  const messageDate = new Date(timestamp);
  const today = new Date();

  const isToday =
    messageDate.getDate() === today.getDate() &&
    messageDate.getMonth() === today.getMonth() &&
    messageDate.getFullYear() === today.getFullYear();

  if (isToday) {
    return messageDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return messageDate.toLocaleDateString();
};

const PARTICIPATION_REVIEW_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

const formatParticipationReviewDuration = (remainingMilliseconds) => {
  if (remainingMilliseconds <= 0) return 'Automatic approval pending.';

  const totalHours = Math.ceil(remainingMilliseconds / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days === 0) {
    return `Automatic approval in ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
  }

  return `Automatic approval in ${days} ${days === 1 ? 'day' : 'days'}${
    hours > 0 ? ` and ${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''
  }.`;
};

export const formatParticipationReviewTimeRemaining = (
  timestamp,
  currentTime = Date.now(),
) => {
  if (!timestamp) return '';

  const reviewStartedAt = new Date(timestamp).getTime();
  if (Number.isNaN(reviewStartedAt)) return '';

  return formatParticipationReviewDuration(
    reviewStartedAt + PARTICIPATION_REVIEW_PERIOD_MS - currentTime,
  );
};

export const formatParticipationReviewDeadlineTimeRemaining = (
  deadline,
  currentTime = Date.now(),
) => {
  if (!deadline) return '';

  const reviewDeadline = new Date(deadline).getTime();
  if (Number.isNaN(reviewDeadline)) return '';

  return formatParticipationReviewDuration(reviewDeadline - currentTime);
};
