import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { db } from '@/db';
import type { Product } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { generateId, nowISO, formatCurrency } from '@/lib/utils';
import { logAction } from '@/services/auditService';

const emptyProduct = (): Partial<Product> => ({
  name: '',
  barcode: '',
  categoryId: '',
  buyPrice: 0,
  sellPrice: 0,
  quantity: 0,
  alertThreshold: 5,
});

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Partial<Product>>(emptyProduct());

  const categories = useLiveQuery(() => db.categories.orderBy('name').toArray()) ?? [];

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const products = useLiveQuery(async () => {
    const all = await db.products.toArray();
    return all
      .filter((p) => {
        const matchSearch =
          !search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.barcode && p.barcode.includes(search));
        const matchCategory = !categoryFilter || p.categoryId === categoryFilter;
        return matchSearch && matchCategory;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [search, categoryFilter]) ?? [];

  const openAdd = () => {
    setEditing(null);
    setForm(emptyProduct());
    setModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({ ...product });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const now = nowISO();

    if (editing) {
      await db.products.update(editing.id, {
        ...form,
        updatedAt: now,
        syncStatus: 'pending',
      });
      await logAction({ action: 'modification', entity: 'produit', entityId: editing.id, entityName: form.name });
    } else {
      const id = generateId();
      await db.products.add({
        id,
        name: form.name!,
        barcode: form.barcode || '',
        categoryId: form.categoryId!,
        buyPrice: Number(form.buyPrice),
        sellPrice: Number(form.sellPrice),
        quantity: Number(form.quantity),
        alertThreshold: Number(form.alertThreshold),
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      });
      await logAction({ action: 'creation', entity: 'produit', entityId: id, entityName: form.name });
    }
    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Supprimer ce produit ?')) {
      const product = await db.products.get(id);
      await db.products.delete(id);
      await db.stockMovements.where('productId').equals(id).delete();
      await logAction({ action: 'suppression', entity: 'produit', entityId: id, entityName: product?.name });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Produits</h1>
        <Button onClick={openAdd}>
          <Plus size={18} /> Ajouter
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Rechercher par nom ou code-barres..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border border-border px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <Table>
          <Thead>
            <Tr>
              <Th>Produit</Th>
              <Th>Catégorie</Th>
              <Th>Prix achat</Th>
              <Th>Prix vente</Th>
              <Th>Stock</Th>
              <Th>Statut</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {products.length === 0 ? (
              <Tr>
                <Td colSpan={7} className="text-center text-text-muted py-8">
                  Aucun produit trouvé
                </Td>
              </Tr>
            ) : (
              products.map((p) => (
                <Tr key={p.id}>
                  <Td>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      {p.barcode && <p className="text-xs text-text-muted">{p.barcode}</p>}
                    </div>
                  </Td>
                  <Td>{categoryMap.get(p.categoryId) ?? '—'}</Td>
                  <Td>{formatCurrency(p.buyPrice)}</Td>
                  <Td>{formatCurrency(p.sellPrice)}</Td>
                  <Td className="font-semibold">{p.quantity}</Td>
                  <Td>
                    {p.quantity <= p.alertThreshold ? (
                      <Badge variant="danger">Stock bas</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-slate-100">
                        <Pencil size={16} className="text-text-muted" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded hover:bg-red-50">
                        <Trash2 size={16} className="text-danger" />
                      </button>
                    </div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Modifier le produit' : 'Nouveau produit'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            label="Nom du produit"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            id="barcode"
            label="Code-barres (optionnel)"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="categoryId" className="text-sm font-medium text-text">
              Catégorie
            </label>
            <select
              id="categoryId"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              <option value="">Sélectionner une catégorie</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {categories.length === 0 && (
              <p className="text-xs text-amber-600">
                Aucune catégorie. Créez-en d'abord dans Paramètres.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="buyPrice"
              label="Prix d'achat"
              type="number"
              min={0}
              value={form.buyPrice}
              onChange={(e) => setForm({ ...form, buyPrice: Number(e.target.value) })}
              required
            />
            <Input
              id="sellPrice"
              label="Prix de vente"
              type="number"
              min={0}
              value={form.sellPrice}
              onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="quantity"
              label="Quantité en stock"
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              required
            />
            <Input
              id="alertThreshold"
              label="Seuil d'alerte"
              type="number"
              min={0}
              value={form.alertThreshold}
              onChange={(e) => setForm({ ...form, alertThreshold: Number(e.target.value) })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">{editing ? 'Modifier' : 'Ajouter'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
