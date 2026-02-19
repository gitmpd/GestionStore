import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Users, CreditCard, AlertCircle, TrendingUp, Clock } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface AdminStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  expiredTenants: number;
  pendingSubs: number;
  activeSubsCount: number;
  totalRevenue: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;
    fetch(`${serverUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stats) return <p className="text-text-muted">Erreur de chargement</p>;

  const cards = [
    { label: 'Total boutiques', value: stats.totalTenants, icon: Store, color: 'text-primary', link: '/admin/tenants' },
    { label: 'Actives', value: stats.activeTenants, icon: Users, color: 'text-success', link: '/admin/tenants?status=active' },
    { label: 'Suspendues', value: stats.suspendedTenants, icon: AlertCircle, color: 'text-danger', link: '/admin/tenants?status=suspended' },
    { label: 'Expirées', value: stats.expiredTenants, icon: Clock, color: 'text-warning', link: '/admin/tenants?status=expired' },
    { label: 'Abonnements actifs', value: stats.activeSubsCount, icon: CreditCard, color: 'text-primary', link: '/admin/subscriptions?status=active' },
    { label: 'En attente validation', value: stats.pendingSubs, icon: AlertCircle, color: 'text-warning', link: '/admin/subscriptions?status=pending' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Dashboard Super-Admin</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.link)}
            className="text-left w-full"
          >
            <Card className="cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">{c.label}</p>
                  <p className="text-2xl font-bold text-text mt-1">{c.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${c.color}`}>
                  <c.icon size={20} />
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate('/admin/subscriptions')}
        className="text-left w-full"
      >
        <Card className="cursor-pointer transition-all duration-200 hover:scale-[1.01] hover:shadow-lg active:scale-[0.98]">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={20} className="text-success" />
            <h2 className="text-lg font-semibold text-text">Revenus abonnements</h2>
          </div>
          <p className="text-3xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-sm text-text-muted mt-1">par cycle actif</p>
        </Card>
      </button>
    </div>
  );
}
