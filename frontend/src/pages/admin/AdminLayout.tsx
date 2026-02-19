import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Store, CreditCard, Settings, MessageSquare, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/ui/Logo';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/tenants', icon: Store, label: 'Boutiques' },
  { to: '/admin/subscriptions', icon: CreditCard, label: 'Abonnements' },
  { to: '/admin/plans', icon: Settings, label: 'Plans' },
  { to: '/admin/feedbacks', icon: MessageSquare, label: 'Retours' },
];

export function AdminLayout() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-surface-alt">
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <Logo size="sm" variant="dark" showText={false} />
          <div>
            <p className="text-sm font-bold text-text">Super Admin</p>
            <p className="text-xs text-text-muted">{user?.name}</p>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-text'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-danger w-full transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
