import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ScrollText, Search, Filter, Download } from 'lucide-react';
import { db } from '@/db';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { formatDateTime } from '@/lib/utils';
import type { AuditAction, AuditEntity } from '@/types';

const actionLabels: Record<AuditAction, string> = {
  connexion: 'Connexion',
  deconnexion: 'Déconnexion',
  creation: 'Création',
  modification: 'Modification',
  suppression: 'Suppression',
  vente: 'Vente',
  mouvement_stock: 'Mouvement stock',
  credit: 'Crédit',
  paiement: 'Paiement',
  reception_commande: 'Réception commande',
  creation_commande: 'Création commande',
  activation: 'Activation',
  desactivation: 'Désactivation',
  depense: 'Dépense',
};

const actionVariants: Record<AuditAction, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
  connexion: 'success',
  deconnexion: 'default',
  creation: 'success',
  modification: 'info',
  suppression: 'danger',
  vente: 'success',
  mouvement_stock: 'warning',
  credit: 'danger',
  paiement: 'success',
  reception_commande: 'success',
  creation_commande: 'info',
  activation: 'success',
  desactivation: 'danger',
  depense: 'danger',
};

const entityLabels: Record<AuditEntity, string> = {
  utilisateur: 'Utilisateur',
  produit: 'Produit',
  categorie: 'Catégorie',
  client: 'Client',
  fournisseur: 'Fournisseur',
  vente: 'Vente',
  stock: 'Stock',
  commande: 'Commande',
  credit: 'Crédit',
  depense: 'Dépense',
};

export function AuditPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const users = useLiveQuery(() => db.users.orderBy('name').toArray()) ?? [];

  const logs = useLiveQuery(async () => {
    const all = await db.auditLogs.orderBy('date').reverse().toArray();
    return all.filter((log) => {
      if (actionFilter && log.action !== actionFilter) return false;
      if (entityFilter && log.entity !== entityFilter) return false;
      if (userFilter && log.userId !== userFilter) return false;
      if (dateFrom && log.date < dateFrom) return false;
      if (dateTo && log.date > dateTo + 'T23:59:59') return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          log.userName.toLowerCase().includes(q) ||
          (log.entityName?.toLowerCase().includes(q) ?? false) ||
          (log.details?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [search, actionFilter, entityFilter, userFilter, dateFrom, dateTo]) ?? [];

  const exportCSV = () => {
    const headers = ['Date', 'Utilisateur', 'Action', 'Entité', 'Nom', 'Détails'];
    const rows = logs.map((l) => [
      formatDateTime(l.date),
      l.userName,
      actionLabels[l.action] ?? l.action,
      entityLabels[l.entity as AuditEntity] ?? l.entity,
      l.entityName ?? '',
      l.details ?? '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-activite-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setEntityFilter('');
    setUserFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasFilters = actionFilter || entityFilter || userFilter || dateFrom || dateTo || search;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ScrollText size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Journal d'activité</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} /> Filtres
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={logs.length === 0}>
            <Download size={16} /> Exporter CSV
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          className="w-full pl-10 pr-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="Rechercher par utilisateur, entité ou détails..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {showFilters && (
        <div className="bg-surface p-4 rounded-xl border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Utilisateur</label>
              <select
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="">Tous</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Action</label>
              <select
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="">Toutes</option>
                {Object.entries(actionLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Entité</label>
              <select
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
              >
                <option value="">Toutes</option>
                {Object.entries(entityLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Date début</label>
              <input
                type="date"
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-text-muted">Date fin</label>
              <input
                type="date"
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-3 text-xs text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-text-muted">
          {logs.length} entrée{logs.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <Table>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Utilisateur</Th>
              <Th>Action</Th>
              <Th>Entité</Th>
              <Th>Nom</Th>
              <Th>Détails</Th>
            </Tr>
          </Thead>
          <Tbody>
            {logs.length === 0 ? (
              <Tr>
                <Td colSpan={6} className="text-center text-text-muted py-8">
                  Aucune activité enregistrée
                </Td>
              </Tr>
            ) : (
              logs.slice(0, 200).map((log) => (
                <Tr key={log.id}>
                  <Td className="text-text-muted whitespace-nowrap text-xs">
                    {formatDateTime(log.date)}
                  </Td>
                  <Td className="font-medium">{log.userName}</Td>
                  <Td>
                    <Badge variant={actionVariants[log.action] ?? 'default'}>
                      {actionLabels[log.action] ?? log.action}
                    </Badge>
                  </Td>
                  <Td>
                    <span className="text-sm">
                      {entityLabels[log.entity as AuditEntity] ?? log.entity}
                    </span>
                  </Td>
                  <Td className="font-medium">{log.entityName ?? '—'}</Td>
                  <Td className="text-text-muted text-xs max-w-[200px] truncate">
                    {log.details ?? '—'}
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>
    </div>
  );
}
