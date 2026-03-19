import { type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
  sidebar?: boolean;
  breadcrumb?: string;
}

export function AppShell({ children, sidebar = true, breadcrumb }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-[#F9F9FA]">
      <Header breadcrumb={breadcrumb} />
      <div className="flex-1 flex overflow-hidden">
        {sidebar && <Sidebar />}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
