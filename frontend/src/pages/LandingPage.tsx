import { Link } from 'react-router-dom';
import {
  ShoppingBag, BarChart3, Users, Package, Wifi, Shield,
  ArrowRight, Check, Smartphone,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

const features = [
  { icon: ShoppingBag, title: 'Ventes rapides', desc: 'Enregistrez vos ventes en quelques clics, même hors connexion.' },
  { icon: Package, title: 'Gestion de stock', desc: 'Suivez votre inventaire en temps réel avec alertes automatiques.' },
  { icon: BarChart3, title: 'Rapports détaillés', desc: 'Analysez vos performances avec des rapports visuels.' },
  { icon: Users, title: 'Multi-utilisateurs', desc: 'Gérant et vendeurs avec des accès adaptés.' },
  { icon: Wifi, title: 'Mode hors-ligne', desc: 'Travaillez sans internet, synchronisation automatique.' },
  { icon: Shield, title: 'Données sécurisées', desc: 'Vos données restent privées et sauvegardées.' },
];

const benefits = [
  'Gestion complète des ventes et du stock',
  'Suivi des clients et crédit',
  'Export CSV et impression de reçus',
  'Commandes fournisseurs et clients',
  'Journal d\'activité complet',
  'Mode sombre inclus',
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-text">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <Logo size="sm" variant="dark" />
          <div className="flex items-center gap-3">
            <Link to="/pricing" className="text-sm font-medium text-text-muted hover:text-text transition-colors">
              Tarifs
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              Connexion
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
            >
              Essai gratuit
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Smartphone size={16} />
            Fonctionne sur mobile, tablette et PC
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            Gérez votre boutique
            <span className="text-primary"> simplement</span>
          </h1>
          <p className="text-lg text-text-muted max-w-2xl mx-auto mb-8">
            GestionStore est la solution tout-en-un pour gérer votre commerce.
            Ventes, stock, clients, dépenses — tout au même endroit, même sans internet.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="flex items-center gap-2 px-6 py-3 text-white bg-primary hover:bg-primary-dark rounded-xl font-medium text-lg transition-colors shadow-lg shadow-primary/25"
            >
              Commencer gratuitement
              <ArrowRight size={20} />
            </Link>
            <Link
              to="/pricing"
              className="px-6 py-3 text-text-muted hover:text-text border border-border rounded-xl font-medium transition-colors"
            >
              Voir les tarifs
            </Link>
          </div>
          <p className="text-sm text-text-muted mt-4">7 jours d'essai gratuit — aucune carte requise</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-surface-alt">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Tout ce dont vous avez besoin</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-surface rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon size={24} className="text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-text-muted text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="text-3xl font-bold mb-6">Pourquoi GestionStore ?</h2>
            <ul className="space-y-3">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <Check size={20} className="text-success mt-0.5 flex-shrink-0" />
                  <span className="text-text-muted">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 bg-surface-alt rounded-2xl border border-border p-8 text-center">
            <p className="text-5xl font-bold text-primary mb-2">7 jours</p>
            <p className="text-text-muted mb-4">d'essai gratuit sans engagement</p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 text-white bg-primary hover:bg-primary-dark rounded-xl font-medium transition-colors"
            >
              Créer ma boutique <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" variant="dark" />
          <p className="text-sm text-text-muted">&copy; {new Date().getFullYear()} Djamatigui — Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}
