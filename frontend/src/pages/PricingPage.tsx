import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Star, X } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import type { Plan } from '@/types';
import { formatCurrency } from '@/lib/utils';

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

const ALL_FEATURES = [
  'Ventes & stock',
  'Catégories',
  'Commandes fournisseurs',
  'Commandes clients',
  'Export CSV',
  "Journal d'audit",
  'Sauvegarde & restauration',
  'Rapports avancés',
  'Synchronisation illimitée',
  'Support dédié',
];

export function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDuration, setSelectedDuration] = useState(30);

  useEffect(() => {
    const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;
    fetch(`${serverUrl}/api/plans`)
      .then((r) => r.json())
      .then((data: Plan[]) => setPlans(data.filter((p) => p.active)))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const tierNames = ['Starter', 'Business', 'Premium'];
    const paid = plans.filter((p) => p.price > 0);
    return tierNames
      .map((name) => {
        const variants = paid.filter((p) => p.name === name).sort((a, b) => a.durationDays - b.durationDays);
        const selected = variants.find((v) => v.durationDays === selectedDuration) || variants[0];
        return { name, variants, selected };
      })
      .filter((g) => g.variants.length > 0);
  }, [plans, selectedDuration]);

  return (
    <div className="min-h-screen bg-surface text-text">
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo size="sm" variant="dark" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors">
              Connexion
            </Link>
            <Link to="/register" className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors">
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-8 transition-colors">
            <ArrowLeft size={16} /> Retour
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-3">Nos tarifs</h1>
          <p className="text-center text-text-muted mb-4 max-w-lg mx-auto">
            Choisissez votre plan et votre durée. Plus la durée est longue, plus vous économisez.
          </p>
          <p className="text-center text-sm text-primary font-medium mb-8">
            Seul le plan Premium donne accès à toutes les fonctionnalités
          </p>

          {/* Duration selector */}
          <div className="flex justify-center mb-10">
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

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {grouped.map((group) => {
                const plan = group.selected;
                if (!plan) return null;
                const premium = group.name.toLowerCase() === 'premium';
                const features = Array.isArray(plan.features) ? plan.features as string[] : [];
                const monthlyEquiv = Math.round(plan.price / (plan.durationDays / 30));

                return (
                  <div
                    key={group.name}
                    className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-200 hover:scale-[1.02] hover:shadow-xl ${
                      premium
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                        : 'border-border bg-surface'
                    }`}
                  >
                    {premium && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full">
                        <Star size={12} /> Accès complet
                      </span>
                    )}
                    <h3 className="text-xl font-bold mb-2">{group.name}</h3>

                    <div className="mb-1">
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(plan.price)}
                      </span>
                    </div>
                    <p className="text-sm text-text-muted mb-1">
                      / {formatDuration(plan.durationDays)}
                    </p>
                    {plan.durationDays > 30 && (
                      <p className="text-xs text-success font-medium mb-4">
                        soit {formatCurrency(monthlyEquiv)}/mois — économie de {discountPercent(plan.durationDays)}%
                      </p>
                    )}
                    {plan.durationDays === 30 && <div className="mb-4" />}

                    <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border text-sm">
                      <span className="font-medium">
                        {plan.maxProducts === 0 ? 'Produits illimités' : `${plan.maxProducts} produits`}
                      </span>
                      <span className="text-text-muted">·</span>
                      <span className="font-medium">
                        {plan.maxUsers === 0 ? 'Utilisateurs illimités' : `${plan.maxUsers} utilisateurs`}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm mb-6 flex-1">
                      {ALL_FEATURES.map((f) => {
                        const included = premium || features.includes(f) || features.includes('Toutes les fonctionnalités');
                        return (
                          <div key={f} className={`flex items-center gap-2 ${included ? '' : 'opacity-40'}`}>
                            {included ? (
                              <Check size={16} className="text-success flex-shrink-0" />
                            ) : (
                              <X size={16} className="text-text-muted flex-shrink-0" />
                            )}
                            <span>{f}</span>
                          </div>
                        );
                      })}
                    </div>

                    <Link
                      to="/register"
                      className={`w-full text-center py-2.5 rounded-xl font-medium transition-colors ${
                        premium
                          ? 'bg-primary text-white hover:bg-primary-dark'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      Choisir ce plan
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-text-muted text-sm">
              Essai gratuit de 7 jours inclus pour tous les nouveaux comptes — aucun engagement.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" variant="dark" />
          <p className="text-sm text-text-muted">&copy; {new Date().getFullYear()} Djamatigui — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}
