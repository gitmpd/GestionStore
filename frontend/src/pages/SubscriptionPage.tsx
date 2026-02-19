import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Check, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Plan, Subscription, Tenant } from '@/types';

function formatDuration(days: number): string {
  if (days >= 365) return '1 an';
  if (days >= 30) return `${Math.round(days / 30)} mois`;
  return `${days} jours`;
}

function discountPercent(days: number): number {
  if (days >= 365) return 30;
  if (days >= 180) return 20;
  if (days >= 90) return 10;
  return 0;
}

const DURATION_OPTIONS = [
  { days: 30, label: '1 mois' },
  { days: 90, label: '3 mois' },
  { days: 180, label: '6 mois' },
  { days: 365, label: '1 an' },
];

export function SubscriptionPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const tenant = useAuthStore((s) => s.tenant);
  const [currentSub, setCurrentSub] = useState<(Subscription & { plan?: Plan }) | null>(null);
  const [tenantInfo, setTenantInfo] = useState<Tenant | null>(tenant);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(30);

  const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;

  useEffect(() => {
    Promise.all([
      fetch(`${serverUrl}/api/subscriptions/current`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${serverUrl}/api/plans`).then((r) => r.json()),
    ])
      .then(([subData, plansData]) => {
        setCurrentSub(subData.subscription);
        setTenantInfo(subData.tenant);
        setPlans(plansData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, serverUrl]);

  const grouped = useMemo(() => {
    const tierNames = ['Starter', 'Business', 'Premium'];
    const paid = plans.filter((p) => p.price > 0 && p.active);
    return tierNames
      .map((name) => {
        const variants = paid.filter((p) => p.name === name).sort((a, b) => a.durationDays - b.durationDays);
        const selected = variants.find((v) => v.durationDays === selectedDuration) || variants[0];
        return { name, variants, selected };
      })
      .filter((g) => g.variants.length > 0);
  }, [plans, selectedDuration]);

  const openUpgrade = (plan: Plan) => {
    setSelectedPlan(plan);
    setPaymentRef('');
    setModalOpen(true);
  };

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${serverUrl}/api/subscriptions/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan.id, paymentRef }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Demande d\'abonnement envoyée ! En attente de validation.');
      setModalOpen(false);
      setCurrentSub(data);
    } catch {
      toast.error('Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const trialExpired = tenantInfo?.trialEndsAt && new Date(tenantInfo.trialEndsAt) < new Date();
  const trialDaysLeft = tenantInfo?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenantInfo.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-text-muted hover:text-text transition-colors">
          <ArrowLeft size={20} />
        </button>
        <CreditCard size={24} className="text-primary" />
        <h1 className="text-2xl font-bold text-text">Mon abonnement</h1>
      </div>

      {/* Current status */}
      <Card>
        <h2 className="text-lg font-semibold text-text mb-4">Statut actuel</h2>
        {currentSub?.status === 'active' ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Check size={20} className="text-success" />
            </div>
            <div>
              <p className="font-medium text-text">
                Plan {currentSub.plan?.name} — {currentSub.plan ? formatDuration(currentSub.plan.durationDays) : ''}
              </p>
              <p className="text-sm text-text-muted">Expire le {formatDate(currentSub.endDate)}</p>
            </div>
            <Badge variant="success" className="ml-auto">Actif</Badge>
          </div>
        ) : currentSub?.status === 'pending' ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock size={20} className="text-warning" />
            </div>
            <div>
              <p className="font-medium text-text">Plan {currentSub.plan?.name}</p>
              <p className="text-sm text-text-muted">En attente de validation par l'administrateur</p>
            </div>
            <Badge variant="warning" className="ml-auto">En attente</Badge>
          </div>
        ) : tenantInfo?.trialEndsAt ? (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${trialExpired ? 'bg-danger/10' : 'bg-primary/10'} flex items-center justify-center`}>
              {trialExpired ? <AlertTriangle size={20} className="text-danger" /> : <Clock size={20} className="text-primary" />}
            </div>
            <div>
              <p className="font-medium text-text">Période d'essai</p>
              <p className="text-sm text-text-muted">
                {trialExpired
                  ? 'Votre période d\'essai a expiré. Souscrivez à un plan pour continuer.'
                  : `${trialDaysLeft} jour(s) restant(s) — expire le ${formatDate(tenantInfo.trialEndsAt!)}`
                }
              </p>
            </div>
            <Badge variant={trialExpired ? 'danger' : 'info'} className="ml-auto">
              {trialExpired ? 'Expiré' : 'Essai'}
            </Badge>
          </div>
        ) : (
          <p className="text-text-muted">Aucun abonnement actif</p>
        )}
      </Card>

      {/* Duration selector */}
      <div>
        <h2 className="text-lg font-semibold text-text mb-3">Choisir un plan</h2>
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
            {DURATION_OPTIONS.map((opt) => {
              const active = selectedDuration === opt.days;
              const discount = discountPercent(opt.days);
              return (
                <button
                  key={opt.days}
                  onClick={() => setSelectedDuration(opt.days)}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                  {discount > 0 && (
                    <span className={`absolute -top-2.5 -right-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-success text-white' : 'bg-success/10 text-success'
                    }`}>
                      -{discount}%
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {grouped.map((group) => {
          const plan = group.selected;
          if (!plan) return null;
          const isCurrent = currentSub?.planId === plan.id && currentSub?.status === 'active';
          const monthlyEquiv = Math.round(plan.price / (plan.durationDays / 30));
          const premium = group.name.toLowerCase() === 'premium';

          return (
            <Card key={group.name} className={`flex flex-col ${isCurrent ? 'border-primary' : ''} ${premium ? 'bg-primary/5' : ''}`}>
              <h3 className="text-lg font-semibold text-text">{group.name}</h3>
              <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(plan.price)}</p>
              <p className="text-sm text-text-muted">/ {formatDuration(plan.durationDays)}</p>
              {plan.durationDays > 30 && (
                <p className="text-xs text-success font-medium mt-0.5">
                  soit {formatCurrency(monthlyEquiv)}/mois
                </p>
              )}
              <div className="space-y-1 text-sm text-text-muted my-3 flex-1">
                <p>Produits : {plan.maxProducts === 0 ? 'Illimité' : plan.maxProducts}</p>
                <p>Utilisateurs : {plan.maxUsers === 0 ? 'Illimité' : plan.maxUsers}</p>
              </div>
              {isCurrent ? (
                <Badge variant="success" className="w-full justify-center py-2">Plan actuel</Badge>
              ) : (
                <Button
                  className="w-full"
                  variant={premium ? 'primary' : 'outline'}
                  onClick={() => openUpgrade(plan)}
                  disabled={currentSub?.status === 'pending'}
                >
                  Souscrire
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Souscrire au plan ${selectedPlan?.name}`}>
        <form onSubmit={handleRequest} className="space-y-4">
          <div className="bg-primary/5 rounded-lg p-4">
            <p className="text-sm text-text-muted">Montant à payer</p>
            <p className="text-2xl font-bold text-primary">{selectedPlan ? formatCurrency(selectedPlan.price) : ''}</p>
            <p className="text-sm text-text-muted mt-1">Durée : {selectedPlan ? formatDuration(selectedPlan.durationDays) : ''}</p>
          </div>
          <Input
            id="paymentRef"
            label="Référence de paiement (optionnel)"
            value={paymentRef}
            onChange={(e) => setPaymentRef(e.target.value)}
            placeholder="Ex: numéro de transaction mobile money"
          />
          <p className="text-xs text-text-muted">
            Votre demande sera vérifiée par l'administrateur. Votre abonnement sera activé après validation du paiement.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
