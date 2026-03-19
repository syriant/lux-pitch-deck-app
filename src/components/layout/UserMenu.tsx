import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-white/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-[#01B18B] flex items-center justify-center text-xs font-semibold text-white">
          {initials}
        </div>
        <span className="text-sm text-white hidden sm:inline">{user.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="text-sm font-medium text-[#363A45]">{user.name}</div>
            <div className="text-xs text-[#7E8188] mt-0.5">{user.email}</div>
            <span className="mt-1.5 inline-block rounded-full bg-[#E6F9F5] px-2 py-0.5 text-[10px] font-medium text-[#01B18B] uppercase">
              {user.roles.includes('admin') ? 'Admin' : 'PCM'}
            </span>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-[#7E8188] hover:bg-gray-50 hover:text-[#363A45]"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
