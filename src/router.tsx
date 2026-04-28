import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/admin/Users';
import { Differentiators } from './pages/admin/Differentiators';
import { ObjectiveTemplates } from './pages/admin/ObjectiveTemplates';
import { DealTiers } from './pages/admin/DealTiers';
import { ParserTest } from './pages/admin/ParserTest';
import { Templates } from './pages/admin/Templates';
import { ImageLibrary } from './pages/admin/ImageLibrary';
import { LlmSettings } from './pages/admin/LlmSettings';
import { ReachStats } from './pages/admin/ReachStats';
import { DeckWizard } from './pages/wizard/DeckWizard';
import { DeckPreview } from './pages/DeckPreview';
import { DeckPrint } from './pages/DeckPrint';
import { CaseStudies } from './pages/CaseStudies';
import { RequireRole } from './components/common/RequireRole';
import { AppShell } from './components/layout/AppShell';

function ShellWithSidebar() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth/callback',
    element: <Login />,
  },
  // Pages with sidebar
  {
    element: (
      <RequireRole roles={['pcm', 'admin']}>
        <ShellWithSidebar />
      </RequireRole>
    ),
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/case-studies', element: <CaseStudies /> },
    ],
  },
  // Admin pages with sidebar
  {
    element: (
      <RequireRole roles={['admin']}>
        <ShellWithSidebar />
      </RequireRole>
    ),
    children: [
      { path: '/admin/users', element: <Users /> },
      { path: '/admin/differentiators', element: <Differentiators /> },
      { path: '/admin/objectives', element: <ObjectiveTemplates /> },
      { path: '/admin/deal-tiers', element: <DealTiers /> },
      { path: '/admin/templates', element: <Templates /> },
      { path: '/admin/image-library', element: <ImageLibrary /> },
      { path: '/admin/llm', element: <LlmSettings /> },
      { path: '/admin/reach-stats', element: <ReachStats /> },
      { path: '/admin/parser-test', element: <ParserTest /> },
    ],
  },
  // Full-width pages (no sidebar)
  {
    path: '/decks/:id/edit',
    element: (
      <RequireRole roles={['pcm', 'admin']}>
        <DeckWizard />
      </RequireRole>
    ),
  },
  {
    path: '/decks/:id/preview',
    element: (
      <RequireRole roles={['pcm', 'admin']}>
        <DeckPreview />
      </RequireRole>
    ),
  },
  {
    path: '/decks/:id/print',
    element: <DeckPrint />,
  },
]);
