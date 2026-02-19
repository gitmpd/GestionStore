import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Store, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    storeName: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Le mot de passe doit avoir au moins 6 caractères');
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;
      const res = await fetch(`${serverUrl}/api/auth/public-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName: form.storeName,
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Erreur lors de l\'inscription');
        return;
      }

      login(data.user, data.token, data.refreshToken, data.tenant);
      toast.success('Bienvenue ! Votre boutique est prête.');
      navigate('/');
    } catch {
      toast.error('Impossible de contacter le serveur');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b border-border px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <Link to="/">
            <Logo size="sm" variant="dark" />
          </Link>
          <Link to="/login" className="text-sm text-primary hover:underline">
            Déjà un compte ?
          </Link>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Retour
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store size={20} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text">Créer ma boutique</h1>
              <p className="text-sm text-text-muted">7 jours d'essai gratuit</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="storeName"
              label="Nom de la boutique"
              value={form.storeName}
              onChange={set('storeName')}
              required
              placeholder="Ex: Boutique Mamadou"
            />
            <Input
              id="name"
              label="Votre nom complet"
              value={form.name}
              onChange={set('name')}
              required
              placeholder="Ex: Mamadou Diallo"
            />
            <Input
              id="email"
              label="Adresse email"
              type="email"
              value={form.email}
              onChange={set('email')}
              required
              placeholder="votre@email.com"
            />
            <Input
              id="password"
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={set('password')}
              required
              placeholder="Au moins 6 caractères"
            />
            <Input
              id="confirmPassword"
              label="Confirmer le mot de passe"
              type="password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              required
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Création en cours...' : 'Créer ma boutique'}
            </Button>
          </form>

          <p className="text-xs text-text-muted text-center mt-6">
            En vous inscrivant, vous acceptez nos conditions d'utilisation.
          </p>
        </div>
      </div>
    </div>
  );
}
