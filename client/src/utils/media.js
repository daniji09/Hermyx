const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const getImageUrl = (mediaPath) => {
  if (!mediaPath) return undefined;

  try {
    return new URL(mediaPath, API_URL).toString();
  } catch {
    return mediaPath;
  }
};
