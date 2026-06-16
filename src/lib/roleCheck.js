// Check if user has admin role (app owner)
export const isAdmin = (user) => {
  return user?.role === 'admin';
};

// Check if user is authenticated (not anonymous)
export const isAuthenticated = (user) => {
  return user && !user.id.startsWith('anon_');
};