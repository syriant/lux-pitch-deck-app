import { Link } from 'react-router-dom';
import { UserMenu } from './UserMenu';

interface HeaderProps {
  breadcrumb?: string;
}

export function Header({ breadcrumb }: HeaderProps) {
  return (
    <header className="h-14 bg-[#363A45] flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/" className="shrink-0">
          <img src="/le-logo-white.svg" alt="Luxury Escapes" className="h-6" />
        </Link>
        <span className="text-white/40 text-sm hidden sm:inline">/</span>
        <span className="text-white text-sm font-medium hidden sm:inline">Pitch Deck Builder</span>
        {breadcrumb && (
          <>
            <span className="text-white/40 text-sm hidden sm:inline">/</span>
            <span className="text-white/70 text-sm truncate">{breadcrumb}</span>
          </>
        )}
      </div>
      <UserMenu />
    </header>
  );
}
