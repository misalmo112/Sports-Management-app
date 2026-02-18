/**
 * RequireAuth guard component
 * Checks if user is authenticated, redirects to home if not
 */
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';

interface RequireAuthProps {
  children: ReactNode;
}

export const RequireAuth = ({ children }: RequireAuthProps) => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
