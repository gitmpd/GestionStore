import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, User, KeyRound, Shield, Store, Pencil } from 'lucide-react';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { nowISO } from '@/lib/utils';
import { logAction } from '@/services/auditService';

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);
  const token = useAuthStore((s) => s.token);
  const setTenant = useAuthStore((s) => s.setTenant);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [shopName, setShopName] = useState('');
  const [savingShop, setSavingShop] = useState(false);
  const [editingShop, setEditingShop] = useState(false);

  useEffect(() => {
    if (tenant?.name) setShopName(tenant.name);
  }, [tenant]);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword.length < 6) {
      toast.error('Le nouveau mot de passe doit avoir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const localUser = await db.users.get(user.id);
      if (!localUser) {
        toast.error('Utilisateur introuvable');
        return;
      }

      const storedPwd = localUser.password ?? '';
      let match = false;
      if (storedPwd.startsWith('$2')) {
        match = await bcrypt.compare(currentPassword, storedPwd);
      } else {
        match = currentPassword === storedPwd;
      }

      if (!match) {
        toast.error('Mot de passe actuel incorrect');
        return;
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await db.users.update(user.id, {
        password: hashed,
        updatedAt: nowISO(),
        syncStatus: 'pending',
      });

      await logAction({
        action: 'modification',
        entity: 'utilisateur',
        entityId: user.id,
        entityName: user.name,
        details: 'Changement de mot de passe (auto)',
      });

      toast.success('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShopName = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = shopName.trim();
    if (!trimmed) {
      toast.error('Le nom de la boutique est requis');
      return;
    }
    if (!tenant) return;

    setSavingShop(true);
    try {
      const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;
      const res = await fetch(`${serverUrl}/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const serverUrl2 = localStorage.getItem('sync_server_url') || window.location.origin;
        const res2 = await fetch(`${serverUrl2}/api/tenant/update-name`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res2.ok) {
          toast.error('Erreur lors de la mise à jour du nom');
          return;
        }
        const updated = await res2.json();
        setTenant({ ...tenant, name: updated.name });
      } else {
        const updated = await res.json();
        setTenant({ ...tenant, name: updated.name ?? trimmed });
      }

      await logAction({
        action: 'modification',
        entity: 'utilisateur',
        entityId: tenant.id,
        entityName: trimmed,
        details: `Nom de boutique modifié : "${tenant.name}" → "${trimmed}"`,
      });

      toast.success('Nom de la boutique mis à jour');
      setEditingShop(false);
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSavingShop(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-text-muted hover:text-text transition-colors" title="Retour">
          <ArrowLeft size={20} />
        </button>
        <User size={24} className="text-primary" />
        <h1 className="text-2xl font-bold text-text">Mon profil</h1>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <User size={28} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text">{user.name}</h2>
            <p className="text-sm text-text-muted">{user.email}</p>
            <Badge variant={user.role === 'gerant' ? 'info' : user.role === 'super_admin' ? 'warning' : 'default'} className="mt-1">
              <Shield size={12} className="mr-1" />
              {user.role === 'gerant' ? 'Gérant' : user.role === 'super_admin' ? 'Super Admin' : 'Vendeur'}
            </Badge>
          </div>
        </div>
      </Card>

      {tenant && user.role === 'gerant' && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Store size={20} className="text-primary" />
            <h2 className="text-lg font-semibold text-text">Ma boutique</h2>
          </div>
          {editingShop ? (
            <form onSubmit={handleSaveShopName} className="space-y-3">
              <Input
                id="shopName"
                label="Nom de la boutique"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Ex : Boutique Diallo"
                required
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { setEditingShop(false); setShopName(tenant.name); }}>
                  Annuler
                </Button>
                <Button type="submit" disabled={savingShop}>
                  {savingShop ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text font-medium">{tenant.name}</p>
                <p className="text-xs text-text-muted">Identifiant : {tenant.slug}</p>
              </div>
              <button
                onClick={() => setEditingShop(true)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-text-muted hover:text-text transition-colors"
                title="Modifier le nom"
              >
                <Pencil size={16} />
              </button>
            </div>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-text">Changer le mot de passe</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <Input
            id="currentPwd"
            label="Mot de passe actuel"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Votre mot de passe actuel"
            required
          />
          <Input
            id="newPwd"
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Au moins 6 caractères"
          />
          <Input
            id="confirmPwd"
            label="Confirmer le nouveau mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Retapez le nouveau mot de passe"
            required
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Changer le mot de passe'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
