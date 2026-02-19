import { useState, useEffect, useCallback, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { Settings, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/lib/utils';
import type { Plan } from '@/types';

function formatDuration(days: number): string {
  if (days >= 365) return '1 an';
  if (days >= 30) return `${Math.round(days / 30)} mois`;
  return `${days} jours`;
}

export function AdminPlans() {
  const token = useAuthStore((s) => s.token);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '', price: '', durationDays: '30', maxProducts: '500', maxUsers: '5', maxSales: '0', sortOrder: '0',
  });

  const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;

  const fetchPlans = useCallback(() => {
    fetch(`${serverUrl}/api/admin/plans`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, serverUrl]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const grouped = useMemo(() => {
    const names = [...new Set(plans.map((p) => p.name))];
    return names.map((name) => ({
      name,
      variants: plans.filter((p) => p.name === name).sort((a, b) => a.durationDays - b.durationDays),
    }));
  }, [plans]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', price: '', durationDays: '30', maxProducts: '500', maxUsers: '5', maxSales: '0', sortOrder: '0' });
    setModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      durationDays: String(p.durationDays),
      maxProducts: String(p.maxProducts),
      maxUsers: String(p.maxUsers),
      maxSales: String(p.maxSales),
      sortOrder: String(p.sortOrder),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      name: form.name,
      price: Number(form.price),
      durationDays: Number(form.durationDays),
      maxProducts: Number(form.maxProducts),
      maxUsers: Number(form.maxUsers),
      maxSales: Number(form.maxSales),
      sortOrder: Number(form.sortOrder),
    };

    try {
      const url = editing
        ? `${serverUrl}/api/admin/plans/${editing.id}`
        : `${serverUrl}/api/admin/plans`;

      const res = await fetch(url, {
        method: editing ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
        return;
      }

      toast.success(editing ? 'Plan modifié' : 'Plan créé');
      setModalOpen(false);
      fetchPlans();
    } catch {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Supprimer le plan "${plan.name} — ${formatDuration(plan.durationDays)}" ?`)) return;
    try {
      const res = await fetch(`${serverUrl}/api/admin/plans/${plan.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success(data.deactivated ? 'Plan désactivé (abonnements liés)' : 'Plan supprimé');
      fetchPlans();
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const set = (field: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Gestion des plans</h1>
        </div>
        <Button onClick={openCreate}><Plus size={16} className="mr-1" /> Nouveau plan</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.name}>
              <h2 className="text-lg font-semibold text-text mb-3">{group.name}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {group.variants.map((p) => (
                  <Card key={p.id} className={!p.active ? 'opacity-50' : ''}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-text-muted">{formatDuration(p.durationDays)}</p>
                        <p className="text-xl font-bold text-primary">
                          {p.price === 0 ? 'Gratuit' : formatCurrency(p.price)}
                        </p>
                      </div>
                      <Badge variant={p.active ? 'success' : 'default'} className="text-xs">
                        {p.active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-xs text-text-muted mb-3">
                      <p>Produits : {p.maxProducts === 0 ? '∞' : p.maxProducts}</p>
                      <p>Utilisateurs : {p.maxUsers === 0 ? '∞' : p.maxUsers}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)} className="flex-1">
                        <Edit2 size={14} className="mr-1" /> Modifier
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(p)} title="Supprimer">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Modifier le plan' : 'Nouveau plan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="planName" label="Nom du plan (tier)" value={form.name} onChange={set('name')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input id="planPrice" label="Prix (FCFA)" type="number" value={form.price} onChange={set('price')} required />
            <Input id="planDuration" label="Durée (jours)" type="number" value={form.durationDays} onChange={set('durationDays')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input id="planMaxProducts" label="Max produits (0=illimité)" type="number" value={form.maxProducts} onChange={set('maxProducts')} />
            <Input id="planMaxUsers" label="Max utilisateurs (0=illimité)" type="number" value={form.maxUsers} onChange={set('maxUsers')} />
          </div>
          <Input id="planOrder" label="Ordre d'affichage" type="number" value={form.sortOrder} onChange={set('sortOrder')} />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit">{editing ? 'Enregistrer' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
