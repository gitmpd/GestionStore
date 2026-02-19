import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, Th, Td, Tr } from '@/components/ui/Table';
import { formatDate, formatCurrency } from '@/lib/utils';

interface SubRow {
  id: string;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate: string;
  paymentRef: string | null;
  createdAt: string;
  tenant: { name: string; slug: string };
  plan: { name: string; price: number };
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  active: 'Actif',
  expired: 'Expiré',
  cancelled: 'Annulé',
};
const statusVariants: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
  pending: 'warning',
  active: 'success',
  expired: 'danger',
  cancelled: 'default',
};

export function AdminSubscriptions() {
  const token = useAuthStore((s) => s.token);
  const [searchParams] = useSearchParams();
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');

  const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;

  const fetchSubs = useCallback(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);

    fetch(`${serverUrl}/api/admin/subscriptions?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setSubs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, filter, serverUrl]);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const validate = async (id: string) => {
    try {
      await fetch(`${serverUrl}/api/admin/subscriptions/${id}/validate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      toast.success('Abonnement validé');
      fetchSubs();
    } catch {
      toast.error('Erreur lors de la validation');
    }
  };

  const reject = async (id: string) => {
    try {
      await fetch(`${serverUrl}/api/admin/subscriptions/${id}/reject`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      toast.success('Abonnement rejeté');
      fetchSubs();
    } catch {
      toast.error('Erreur');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard size={24} className="text-primary" />
        <h1 className="text-2xl font-bold text-text">Gestion des abonnements</h1>
      </div>

      <Card>
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'pending', 'active', 'expired', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'Tous' : statusLabels[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : subs.length === 0 ? (
          <p className="text-center text-text-muted py-12">Aucun abonnement trouvé</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Boutique</Th>
                  <Th>Plan</Th>
                  <Th>Prix</Th>
                  <Th>Statut</Th>
                  <Th>Réf. paiement</Th>
                  <Th>Début</Th>
                  <Th>Fin</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <div>
                        <p className="font-medium text-text">{s.tenant.name}</p>
                        <p className="text-xs text-text-muted">{s.tenant.slug}</p>
                      </div>
                    </Td>
                    <Td>{s.plan.name}</Td>
                    <Td>{formatCurrency(s.plan.price)}</Td>
                    <Td><Badge variant={statusVariants[s.status]}>{statusLabels[s.status]}</Badge></Td>
                    <Td>{s.paymentRef || '—'}</Td>
                    <Td>{formatDate(s.startDate)}</Td>
                    <Td>{formatDate(s.endDate)}</Td>
                    <Td>
                      {s.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="primary" onClick={() => validate(s.id)}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => reject(s.id)}>
                            <X size={14} />
                          </Button>
                        </div>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
