import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { generateId, nowISO } from '@/lib/utils';
import { logAction } from '@/services/auditService';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        login(data.user, data.token, data.refreshToken);
        await logAction({ action: 'connexion', entity: 'utilisateur', entityName: data.user.name });
        navigate('/');
        return;
      }

      if (res.status === 401) {
        setError('Email ou mot de passe incorrect');
      } else {
        throw new Error();
      }
    } catch {
      const defaultAccounts: Record<string, { name: string; role: 'gerant' | 'vendeur' }> = {
        'admin@store.com:admin123': { name: 'Administrateur', role: 'gerant' },
        'vendeur@store.com:vendeur123': { name: 'Vendeur', role: 'vendeur' },
      };
      const key = `${email}:${password}`;
      const defaultAccount = defaultAccounts[key];

      if (defaultAccount) {
        const now = nowISO();
        const existing = await db.users.where('email').equals(email).first();
        const userData = existing ?? {
          id: generateId(),
          name: defaultAccount.name,
          email,
          role: defaultAccount.role,
          active: true,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        };

        if (!existing) {
          await db.users.add(userData);
        }

        login(userData, 'offline-token', 'offline-refresh');
        await logAction({ action: 'connexion', entity: 'utilisateur', entityName: defaultAccount.name, details: 'Connexion hors-ligne' });
        navigate('/');
        return;
      }

      const localUser = await db.users.where('email').equals(email).first();
      if (localUser && localUser.deleted) {
        setError('Ce compte a été supprimé. Contactez le gérant.');
      } else if (localUser && localUser.password === password && localUser.active) {
        login(localUser, 'offline-token', 'offline-refresh');
        await logAction({ action: 'connexion', entity: 'utilisateur', entityName: localUser.name, details: 'Connexion hors-ligne (compte local)' });
        navigate('/');
      } else if (localUser && !localUser.active) {
        setError('Ce compte a été désactivé. Contactez le gérant.');
      } else if (localUser) {
        setError('Mot de passe incorrect');
      } else {
        setError('Aucun compte trouvé avec cet email.\nComptes par défaut :\n• Gérant : admin@store.com / admin123\n• Vendeur : vendeur@store.com / vendeur123');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary p-4">
      <div className="w-full max-w-md bg-surface rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-dark">GestionStore</h1>
          <p className="text-text-muted mt-2">Connectez-vous à votre boutique</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="admin@store.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            id="password"
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{error}</div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <p className="text-xs text-text-muted text-center mt-6">
          Fonctionne même hors connexion
        </p>
        <p className="text-[10px] text-text-muted/50 text-center mt-2">
          &copy; Djamatigui 2026
        </p>
      </div>
    </div>
  );
}
