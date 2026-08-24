export const getProtectedRouteRedirect = ({
  currentUser,
  isAdmin,
  isSyncing,
  reverseLogic,
  requireAdmin,
  requireRegularUser,
}) => {
  if (!currentUser && !reverseLogic && !isSyncing) return '/login';
  if (currentUser && reverseLogic && !isSyncing) return '/';
  if (requireAdmin && !isAdmin && !isSyncing) return '/';
  if (requireRegularUser && isAdmin && !isSyncing) return '/reports';
  return null;
};
