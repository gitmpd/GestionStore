import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';
import { db } from '@/db';
import type { StockMovementType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { generateId, nowISO, formatDateTime } from '@/lib/utils';
import { logAction } from '@/services/auditService';

const typeLabels: Record<StockMovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  ajustement: 'Ajustement',
};

const typeVariants: Record<StockMovementType, 'success' | 'danger' | 'info'> = {
  entree: 'success',
  sortie: 'danger',
  ajustement: 'info',
};

const typeIcons: Record<StockMovementType, typeof ArrowDownCircle> = {
  entree: ArrowDownCircle,
  sortie: ArrowUpCircle,
  ajustement: RefreshCw,
};

export function StockPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [type, setType] = useState<StockMovementType>('entree');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState('');

  const movements = useLiveQuery(() =>
    db.stockMovements.orderBy('date').reverse().limit(100).toArray()
  ) ?? [];

  const products = useLiveQuery(() => db.products.orderBy('name').toArray()) ?? [];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const product = await db.products.get(productId);
    if (!product) return;

    const now = nowISO();
    let newQty = product.quantity;
    if (type === 'entree') newQty += quantity;
    else if (type === 'sortie') newQty = Math.max(0, newQty - quantity);
    else newQty = quantity;

    await db.products.update(productId, {
      quantity: newQty,
      updatedAt: now,
      syncStatus: 'pending',
    });

    await db.stockMovements.add({
      id: generateId(),
      productId,
      productName: product.name,
      type,
      quantity,
      date: now,
      reason,
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });

    const typeLabel = type === 'entree' ? 'Entrée' : type === 'sortie' ? 'Sortie' : 'Ajustement';
    await logAction({
      action: 'mouvement_stock',
      entity: 'stock',
      entityId: productId,
      entityName: product.name,
      details: `${typeLabel} de ${quantity} unités — ${reason}`,
    });

    setModalOpen(false);
    setProductId('');
    setQuantity(0);
    setReason('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Mouvements de stock</h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nouveau mouvement
        </Button>
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <Table>
          <Thead>
            <Tr>
              <Th>Type</Th>
              <Th>Produit</Th>
              <Th>Quantité</Th>
              <Th>Raison</Th>
              <Th>Date</Th>
            </Tr>
          </Thead>
          <Tbody>
            {movements.length === 0 ? (
              <Tr>
                <Td colSpan={5} className="text-center text-text-muted py-8">
                  Aucun mouvement enregistré
                </Td>
              </Tr>
            ) : (
              movements.map((m) => {
                const Icon = typeIcons[m.type];
                return (
                  <Tr key={m.id}>
                    <Td>
                      <Badge variant={typeVariants[m.type]} className="flex items-center gap-1 w-fit">
                        <Icon size={14} /> {typeLabels[m.type]}
                      </Badge>
                    </Td>
                    <Td className="font-medium">{m.productName}</Td>
                    <Td className="font-semibold">{m.quantity}</Td>
                    <Td className="text-text-muted">{m.reason}</Td>
                    <Td className="text-text-muted">{formatDateTime(m.date)}</Td>
                  </Tr>
                );
              })
            )}
          </Tbody>
        </Table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouveau mouvement de stock"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text">Type</label>
            <div className="flex gap-2">
              {(['entree', 'sortie', 'ajustement'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    type === t
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-text-muted hover:bg-slate-50'
                  }`}
                >
                  {typeLabels[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text">Produit</label>
            <select
              className="rounded-lg border border-border px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              <option value="">Sélectionner un produit</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stock: {p.quantity})
                </option>
              ))}
            </select>
          </div>

          <Input
            id="qty"
            label={type === 'ajustement' ? 'Nouvelle quantité' : 'Quantité'}
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            required
          />
          <Input
            id="reason"
            label="Raison"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Réapprovisionnement, Vente, Inventaire..."
            required
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
