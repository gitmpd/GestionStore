import { useState, type FormEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trash2, ShoppingBag, Eye, XCircle } from 'lucide-react';
import { db } from '@/db';
import type { PaymentMethod, Sale, SaleItem as SaleItemType } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/Table';
import { useAuthStore } from '@/stores/authStore';
import { generateId, nowISO, formatCurrency, formatDateTime } from '@/lib/utils';
import { logAction } from '@/services/auditService';
import { confirmAction } from '@/stores/confirmStore';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  maxStock: number;
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Espèces',
  credit: 'Crédit',
  mobile: 'Mobile Money',
};

export function SalesPage() {
  const user = useAuthStore((s) => s.user);
  const [modalOpen, setModalOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [customerId, setCustomerId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<SaleItemType[]>([]);

  const products = useLiveQuery(() => db.products.orderBy('name').toArray()) ?? [];
  const customers = useLiveQuery(() => db.customers.orderBy('name').toArray()) ?? [];
  const recentSales = useLiveQuery(async () => {
    const all = await db.sales.orderBy('date').reverse().limit(50).toArray();
    return all.filter((s) => !s.deleted);
  }) ?? [];

  const filteredProducts = products.filter(
    (p) =>
      p.quantity > 0 &&
      (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        (p.barcode && p.barcode.includes(productSearch)))
  );

  const total = cart.reduce((s, item) => s + item.quantity * item.unitPrice, 0);

  const addToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const existing = cart.find((c) => c.productId === productId);
    if (existing) {
      if (existing.quantity < product.quantity) {
        setCart(
          cart.map((c) =>
            c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c
          )
        );
      }
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          unitPrice: product.sellPrice,
          maxStock: product.quantity,
        },
      ]);
    }
  };

  const updateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => c.productId !== productId));
    } else {
      setCart(
        cart.map((c) =>
          c.productId === productId
            ? { ...c, quantity: Math.min(qty, c.maxStock) }
            : c
        )
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !user) return;

    const now = nowISO();
    const saleId = generateId();

    await db.sales.add({
      id: saleId,
      userId: user.id,
      customerId: customerId || undefined,
      date: now,
      total,
      paymentMethod,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending',
    });

    for (const item of cart) {
      await db.saleItems.add({
        id: generateId(),
        saleId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'pending',
      });

      const product = await db.products.get(item.productId);
      if (product) {
        await db.products.update(item.productId, {
          quantity: Math.max(0, product.quantity - item.quantity),
          updatedAt: now,
          syncStatus: 'pending',
        });

        await db.stockMovements.add({
          id: generateId(),
          productId: item.productId,
          productName: item.productName,
          type: 'sortie',
          quantity: item.quantity,
          date: now,
          reason: `Vente #${saleId.slice(0, 8)}`,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        });
      }
    }

    if (paymentMethod === 'credit' && customerId) {
      const customer = await db.customers.get(customerId);
      if (customer) {
        await db.customers.update(customerId, {
          creditBalance: customer.creditBalance + total,
          updatedAt: now,
          syncStatus: 'pending',
        });

        await db.creditTransactions.add({
          id: generateId(),
          customerId,
          saleId,
          amount: total,
          type: 'credit',
          date: now,
          note: `Vente #${saleId.slice(0, 8)}`,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending',
        });
      }
    }

    const itemsSummary = cart.map((i) => `${i.productName} x${i.quantity}`).join(', ');
    await logAction({
      action: 'vente',
      entity: 'vente',
      entityId: saleId,
      details: `${formatCurrency(total)} — ${paymentLabels[paymentMethod]} — ${itemsSummary}`,
    });

    setCart([]);
    setCustomerId('');
    setModalOpen(false);
  };

  const viewSaleDetails = async (sale: Sale) => {
    const items = await db.saleItems.where('saleId').equals(sale.id).toArray();
    setSelectedSale(sale);
    setSelectedItems(items);
    setDetailModalOpen(true);
  };

  const handleDeleteSale = async (sale: Sale) => {
    const ok = await confirmAction({
      title: 'Supprimer la vente',
      message: `Voulez-vous vraiment supprimer la vente #${sale.id.slice(0, 8)} de ${formatCurrency(sale.total)} ?`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    });
    if (!ok) return;

    const now = nowISO();
    await db.sales.update(sale.id, {
      deleted: true,
      status: 'cancelled',
      updatedAt: now,
      syncStatus: 'pending',
    });

    const items = await db.saleItems.where('saleId').equals(sale.id).toArray();
    const itemsSummary = items.map((i) => `${i.productName} x${i.quantity}`).join(', ');

    await logAction({
      action: 'suppression',
      entity: 'vente',
      entityId: sale.id,
      entityName: `#${sale.id.slice(0, 8)}`,
      details: `${formatCurrency(sale.total)} — ${paymentLabels[sale.paymentMethod]} — ${itemsSummary}`,
    });
  };

  const customerMap = new Map(customers.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text">Ventes</h1>
        <Button onClick={() => setModalOpen(true)}>
          <ShoppingBag size={18} /> Nouvelle vente
        </Button>
      </div>

      <div className="bg-surface rounded-xl border border-border">
        <Table>
          <Thead>
            <Tr>
              <Th>Réf.</Th>
              <Th>Date</Th>
              <Th>Client</Th>
              <Th>Montant</Th>
              <Th>Paiement</Th>
              <Th>Statut</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {recentSales.length === 0 ? (
              <Tr>
                <Td colSpan={7} className="text-center text-text-muted py-8">
                  Aucune vente enregistrée
                </Td>
              </Tr>
            ) : (
              recentSales.map((s) => (
                <Tr key={s.id}>
                  <Td className="font-mono text-sm">#{s.id.slice(0, 8)}</Td>
                  <Td className="text-text-muted">{formatDateTime(s.date)}</Td>
                  <Td>{s.customerId ? customerMap.get(s.customerId) ?? '—' : '—'}</Td>
                  <Td className="font-semibold">{formatCurrency(s.total)}</Td>
                  <Td>
                    <Badge variant={s.paymentMethod === 'credit' ? 'warning' : 'default'}>
                      {paymentLabels[s.paymentMethod]}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge variant={s.status === 'completed' ? 'success' : 'danger'}>
                      {s.status === 'completed' ? 'Terminée' : 'Annulée'}
                    </Badge>
                  </Td>
                  <Td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => viewSaleDetails(s)}
                        className="p-1.5 rounded hover:bg-blue-50 text-primary"
                        title="Voir le détail"
                      >
                        <Eye size={16} />
                      </button>
                      {s.status === 'completed' && (
                        <button
                          onClick={() => handleDeleteSale(s)}
                          className="p-1.5 rounded hover:bg-red-50 text-danger"
                          title="Supprimer"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
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
        title="Nouvelle vente"
        className="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              id="productSearch"
              label="Ajouter un produit"
              placeholder="Rechercher par nom ou code-barres..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productSearch && (
              <div className="mt-1 max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      addToCart(p.id);
                      setProductSearch('');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-sm text-left"
                  >
                    <span>{p.name}</span>
                    <span className="text-text-muted">
                      {formatCurrency(p.sellPrice)} · Stock: {p.quantity}
                    </span>
                  </button>
                ))}
                {filteredProducts.length === 0 && (
                  <p className="px-3 py-2 text-sm text-text-muted">Aucun produit trouvé</p>
                )}
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left">Produit</th>
                    <th className="px-3 py-2 text-center w-24">Qté</th>
                    <th className="px-3 py-2 text-right">Prix</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cart.map((item) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={1}
                          max={item.maxStock}
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQuantity(item.productId, Number(e.target.value))
                          }
                          className="w-16 text-center rounded border border-border px-1 py-0.5"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                      <td className="px-1">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, 0)}
                          className="p-1 text-danger hover:bg-red-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold">
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-lg font-bold text-primary">
                      {formatCurrency(total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Mode de paiement</label>
              <select
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              >
                <option value="cash">Espèces</option>
                <option value="mobile">Mobile Money</option>
                <option value="credit">Crédit</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text">Client (optionnel)</label>
              <select
                className="rounded-lg border border-border px-3 py-2 text-sm"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">— Aucun —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={cart.length === 0}>
              Valider la vente ({formatCurrency(total)})
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Vente #${selectedSale?.id.slice(0, 8) ?? ''}`}
        className="max-w-lg"
      >
        {selectedSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-text-muted">Date</p>
                <p className="font-medium">{formatDateTime(selectedSale.date)}</p>
              </div>
              <div>
                <p className="text-text-muted">Paiement</p>
                <p className="font-medium">{paymentLabels[selectedSale.paymentMethod]}</p>
              </div>
              <div>
                <p className="text-text-muted">Client</p>
                <p className="font-medium">
                  {selectedSale.customerId ? customerMap.get(selectedSale.customerId) ?? '—' : 'Anonyme'}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Statut</p>
                <Badge variant={selectedSale.status === 'completed' ? 'success' : 'danger'}>
                  {selectedSale.status === 'completed' ? 'Terminée' : 'Annulée'}
                </Badge>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left">Produit</th>
                    <th className="px-3 py-2 text-center">Qté</th>
                    <th className="px-3 py-2 text-right">Prix unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {selectedItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
                    <td className="px-3 py-2 text-right text-lg font-bold text-primary">
                      {formatCurrency(selectedSale.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
