import { createBrowserRouter } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
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
]);
