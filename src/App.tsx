import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function App() {
  const { accessToken, loadUser } = useAuthStore();

  useEffect(() => {
    if (accessToken) {
      loadUser();
    }
  }, [accessToken, loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
