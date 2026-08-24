export const getDisplayName = (user) =>
  [user?.name, user?.surnames].filter(Boolean).join(' ').trim() ||
  user?.username ||
  '';

export const getInitials = (name) =>
  name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';
