import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Store, Search, Users, Package, ShoppingBag, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Table, Th, Td, Tr } from '@/components/ui/Table';
import { formatDate } from '@/lib/utils';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'expired';
  trialEndsAt: string | null;
  createdAt: string;
  subscriptions: { plan: { name: string } }[];
  _count: { users: number; products: number; sales: number };
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  suspended: 'Suspendue',
  expired: 'Expirée',
};
const statusVariants: Record<string, 'success' | 'danger' | 'warning'> = {
  active: 'success',
  suspended: 'danger',
  expired: 'warning',
};

export function AdminTenants() {
  const token = useAuthStore((s) => s.token);
  const [searchParams] = useSearchParams();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [resetModal, setResetModal] = useState<{ tenantId: string; tenantName: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;

  const fetchTenants = useCallback(() => {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (search) params.set('search', search);

    fetch(`${serverUrl}/api/admin/tenants?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setTenants)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, filter, search, serverUrl]);

  useEffect(() => { fetchTenants(); }, [fetchTenants]);

  const handleResetPassword = async () => {
    if (!resetModal || !newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    setResetting(true);
    try {
      const res = await fetch(`${serverUrl}/api/admin/tenants/${resetModal.tenantId}/reset-owner-password`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setResetModal(null);
        setNewPassword('');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setResetting(false);
    }
  };

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'suspended' ? 'active' : 'suspended';
    try {
      await fetch(`${serverUrl}/api/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      toast.success(next === 'suspended' ? 'Boutique suspendue' : 'Boutique réactivée');
      fetchTenants();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Store size={24} className="text-primary" />
        <h1 className="text-2xl font-bold text-text">Gestion des boutiques</h1>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Rechercher une boutique..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface text-text text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-surface text-text text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="suspended">Suspendues</option>
            <option value="expired">Expirées</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : tenants.length === 0 ? (
          <p className="text-center text-text-muted py-12">Aucune boutique trouvée</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <Th>Boutique</Th>
                  <Th>Statut</Th>
                  <Th>Plan</Th>
                  <Th>Utilisateurs</Th>
                  <Th>Produits</Th>
                  <Th>Ventes</Th>
                  <Th>Créée le</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((t) => (
                  <Tr key={t.id}>
                    <Td>
                      <div>
                        <p className="font-medium text-text">{t.name}</p>
                        <p className="text-xs text-text-muted">{t.slug}</p>
                      </div>
                    </Td>
                    <Td><Badge variant={statusVariants[t.status]}>{statusLabels[t.status]}</Badge></Td>
                    <Td>{t.subscriptions[0]?.plan?.name || (t.trialEndsAt ? 'Essai' : '—')}</Td>
                    <Td><span className="flex items-center gap-1"><Users size={14} /> {t._count.users}</span></Td>
                    <Td><span className="flex items-center gap-1"><Package size={14} /> {t._count.products}</span></Td>
                    <Td><span className="flex items-center gap-1"><ShoppingBag size={14} /> {t._count.sales}</span></Td>
                    <Td>{formatDate(t.createdAt)}</Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button
                          variant={t.status === 'suspended' ? 'primary' : 'danger'}
                          size="sm"
                          onClick={() => toggleStatus(t.id, t.status)}
                        >
                          {t.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setResetModal({ tenantId: t.id, tenantName: t.name })}
                          title="Réinitialiser le mot de passe du gérant"
                        >
                          <KeyRound size={14} />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      <Modal
        open={!!resetModal}
        onClose={() => { setResetModal(null); setNewPassword(''); }}
        title={`Réinitialiser le mot de passe — ${resetModal?.tenantName ?? ''}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Le gérant de cette boutique devra changer son mot de passe à la prochaine connexion.
          </p>
          <Input
            id="newPassword"
            label="Nouveau mot de passe"
            type="password"
            placeholder="Min. 6 caractères"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => { setResetModal(null); setNewPassword(''); }}>
              Annuler
            </Button>
            <Button onClick={handleResetPassword} disabled={resetting || newPassword.length < 6}>
              {resetting ? 'Réinitialisation...' : 'Réinitialiser'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
