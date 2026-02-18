import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Shield,
  ShieldCheck,
  Database,
  UserPlus,
  UserCheck,
  UserX,
} from 'lucide-react';
import { db } from '@/db';
import { seedTestData } from '@/db/seed';
import { useAuthStore } from '@/stores/authStore';
import type { User, UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card, CardTitle } from '@/components/ui/Card';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { generateId, nowISO } from '@/lib/utils';
import { logAction } from '@/services/auditService';

export function SettingsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [serverUrl, setServerUrl] = useState(
    localStorage.getItem('sync_server_url') || ''
  );

  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'vendeur' as UserRole });
  const [userError, setUserError] = useState('');

  const users = useLiveQuery(() => db.users.orderBy('name').toArray()) ?? [];

  const pendingCount = useLiveQuery(async () => {
    const tables = [
      db.users,
      db.categories,
      db.products,
      db.customers,
      db.suppliers,
      db.sales,
      db.saleItems,
      db.supplierOrders,
      db.orderItems,
      db.stockMovements,
      db.creditTransactions,
      db.auditLogs,
      db.expenses,
    ];
    let count = 0;
    for (const table of tables) {
      count += await table.where('syncStatus').equals('pending').count();
    }
    return count;
  }) ?? 0;

  const handleSaveServer = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sync_server_url', serverUrl);
    setSyncModalOpen(false);
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setUserError('Tous les champs sont obligatoires');
      return;
    }

    if (newUser.password.length < 6) {
      setUserError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const existing = await db.users.where('email').equals(newUser.email.trim()).first();
    if (existing) {
      setUserError('Cet email existe déjà');
      return;
    }

    const now = nowISO();
    await db.users.add({
      id: generateId(),
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      password: newUser.password,
      role: newUser.role,
      active: true,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await logAction({ action: 'creation', entity: 'utilisateur', entityName: newUser.name.trim(), details: `Rôle: ${newUser.role}` });

    setNewUser({ name: '', email: '', password: '', role: 'vendeur' });
    setUserModalOpen(false);
  };

  const toggleUserActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('Vous ne pouvez pas désactiver votre propre compte');
      return;
    }
    const action = user.active ? 'désactiver' : 'réactiver';
    if (!confirm(`Voulez-vous ${action} le compte de ${user.name} ?`)) return;

    await db.users.update(user.id, {
      active: !user.active,
      updatedAt: nowISO(),
      syncStatus: 'pending',
    });

    await logAction({
      action: user.active ? 'desactivation' : 'activation',
      entity: 'utilisateur',
      entityId: user.id,
      entityName: user.name,
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Paramètres</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Compte actuel</CardTitle>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Nom</span>
              <span className="text-sm font-medium">{currentUser?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Email</span>
              <span className="text-sm font-medium">{currentUser?.email}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-muted">Rôle</span>
              <Badge variant={currentUser?.role === 'gerant' ? 'info' : 'default'}>
                {currentUser?.role === 'gerant' ? (
                  <span className="flex items-center gap-1"><ShieldCheck size={14} /> Gérant</span>
                ) : (
                  <span className="flex items-center gap-1"><Shield size={14} /> Vendeur</span>
                )}
              </Badge>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Synchronisation</CardTitle>
          <div className="space-y-3 mt-4">
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Éléments en attente</span>
              <Badge variant={pendingCount > 0 ? 'warning' : 'success'}>
                {pendingCount} en attente
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-text-muted">Serveur</span>
              <span className="text-sm font-medium text-text-muted">
                {localStorage.getItem('sync_server_url') || 'Non configuré'}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSyncModalOpen(true)}
            >
              Configurer le serveur
            </Button>
          </div>
        </Card>
      </div>

      {currentUser?.role === 'gerant' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Gestion des utilisateurs</CardTitle>
            <Button size="sm" onClick={() => { setUserError(''); setUserModalOpen(true); }}>
              <UserPlus size={16} /> Nouveau
            </Button>
          </div>

          <div className="bg-surface-alt rounded-lg border border-border">
            <Table>
              <Thead>
                <Tr>
                  <Th>Nom</Th>
                  <Th>Email</Th>
                  <Th>Rôle</Th>
                  <Th>Statut</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {users.length === 0 ? (
                  <Tr>
                    <Td colSpan={5} className="text-center text-text-muted py-6">
                      Aucun utilisateur enregistré localement
                    </Td>
                  </Tr>
                ) : (
                  users.map((u) => (
                    <Tr key={u.id}>
                      <Td className="font-medium">{u.name}</Td>
                      <Td className="text-text-muted">{u.email}</Td>
                      <Td>
                        <Badge variant={u.role === 'gerant' ? 'info' : 'default'}>
                          {u.role === 'gerant' ? 'Gérant' : 'Vendeur'}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge variant={u.active ? 'success' : 'danger'}>
                          {u.active ? 'Actif' : 'Désactivé'}
                        </Badge>
                      </Td>
                      <Td>
                        {u.id !== currentUser?.id && (
                          <button
                            onClick={() => toggleUserActive(u)}
                            className={`p-1.5 rounded transition-colors ${
                              u.active
                                ? 'hover:bg-red-50 text-danger'
                                : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                            title={u.active ? 'Désactiver' : 'Réactiver'}
                          >
                            {u.active ? <UserX size={16} /> : <UserCheck size={16} />}
                          </button>
                        )}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </div>
        </Card>
      )}

      {currentUser?.role === 'gerant' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Gestion des données</CardTitle>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={seeding}
              onClick={async () => {
                if (!currentUser) return;
                if (!confirm('Charger les données de test ? Les données existantes seront conservées.')) return;
                setSeeding(true);
                try {
                  await seedTestData(currentUser.id);
                  alert('Données de test chargées avec succès !');
                } catch (err) {
                  alert('Erreur : ' + (err as Error).message);
                } finally {
                  setSeeding(false);
                }
              }}
            >
              <Database size={16} />
              {seeding ? 'Chargement...' : 'Charger les données de test'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={async () => {
                if (confirm('Êtes-vous sûr de vouloir effacer toutes les données locales ? Cette action est irréversible.')) {
                  await db.delete();
                  window.location.reload();
                }
              }}
            >
              Réinitialiser les données locales
            </Button>
          </div>
        </Card>
      )}

      <Modal
        open={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        title="Configuration du serveur"
      >
        <form onSubmit={handleSaveServer} className="space-y-4">
          <Input
            id="serverUrl"
            label="URL du serveur"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://mon-serveur.com/api"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={() => setSyncModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title="Nouvel utilisateur"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            id="userName"
            label="Nom complet"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            placeholder="Ex : Moussa Traoré"
            required
          />
          <Input
            id="userEmail"
            label="Email"
            type="email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            placeholder="moussa@store.com"
            required
          />
          <Input
            id="userPassword"
            label="Mot de passe"
            type="password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            placeholder="Minimum 6 caractères"
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text">Rôle</label>
            <div className="flex gap-2">
              {([
                { value: 'vendeur' as const, label: 'Vendeur', icon: Shield },
                { value: 'gerant' as const, label: 'Gérant', icon: ShieldCheck },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewUser({ ...newUser, role: opt.value })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    newUser.role === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:bg-slate-50'
                  }`}
                >
                  <opt.icon size={16} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {userError && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-lg">{userError}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setUserModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Créer le compte</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
