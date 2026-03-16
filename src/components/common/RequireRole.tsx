import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';

interface RequireRoleProps {
  roles: string[];
  children: React.ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const hasRole = roles.some((role) => user.roles.includes(role as 'pcm' | 'admin'));

  if (!hasRole) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have access to this page.</p>
          <a href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
