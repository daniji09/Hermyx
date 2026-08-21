// Shortens a string
export const stringShortener = (string, length) => {
  if (string.length > length) string = string.substring(0, length);
  return string;
};

// Truncates text
export const truncateText = (text, maxLength = 20) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};
