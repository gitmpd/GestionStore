import { Menu, LogOut, Wifi, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const logout = useAuthStore((s) => s.logout);
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-surface border-b border-border lg:px-6">
      <button
        onClick={onMenuClick}
        className="p-2 rounded-lg hover:bg-slate-100 lg:hidden"
      >
        <Menu size={22} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            isOnline
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted hover:text-danger rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </div>
    </header>
  );
}
