export const stringShortener = (string, length) => {
  if (string.length > length) string = string.substring(0, length);
  return string;
};
