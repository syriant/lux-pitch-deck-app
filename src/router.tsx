import { createBrowserRouter } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/admin/Users';
import { Differentiators } from './pages/admin/Differentiators';
import { RequireRole } from './components/common/RequireRole';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireRole roles={['pcm', 'admin']}>
        <Dashboard />
      </RequireRole>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <RequireRole roles={['admin']}>
        <Users />
      </RequireRole>
    ),
  },
  {
    path: '/admin/differentiators',
    element: (
      <RequireRole roles={['admin']}>
        <Differentiators />
      </RequireRole>
    ),
  },
]);
