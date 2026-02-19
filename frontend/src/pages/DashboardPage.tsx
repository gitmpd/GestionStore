import { useLiveQuery } from 'dexie-react-hooks';
import { Package, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import { db } from '@/db';
import { Card, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Package;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
      <div>
        <p className="text-sm text-text-muted">{label}</p>
        <p className="text-2xl font-bold text-text">{value}</p>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const categories = useLiveQuery(() => db.categories.toArray()) ?? [];
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const productCount = useLiveQuery(() => db.products.count()) ?? 0;
  const customerCount = useLiveQuery(() => db.customers.count()) ?? 0;
  const lowStockCount = useLiveQuery(async () => {
    const products = await db.products.toArray();
    return products.filter((p) => p.quantity <= p.alertThreshold).length;
  }) ?? 0;

  const todaySales = useLiveQuery(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const sales = await db.sales
      .where('date')
      .startsWithIgnoreCase(today)
      .toArray();
    return sales.reduce((sum, s) => sum + s.total, 0);
  }) ?? 0;

  const recentSales = useLiveQuery(async () => {
    return db.sales.orderBy('date').reverse().limit(10).toArray();
  }) ?? [];

  const lowStockProducts = useLiveQuery(async () => {
    const products = await db.products.toArray();
    return products
      .filter((p) => p.quantity <= p.alertThreshold)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5);
  }) ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Tableau de bord</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Ventes du jour"
          value={formatCurrency(todaySales)}
          color="bg-primary"
        />
        <StatCard
          icon={Package}
          label="Produits"
          value={productCount}
          color="bg-emerald-500"
        />
        <StatCard
          icon={Users}
          label="Clients"
          value={customerCount}
          color="bg-blue-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stock bas"
          value={lowStockCount}
          color={lowStockCount > 0 ? 'bg-amber-500' : 'bg-slate-400'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Dernières ventes</CardTitle>
          {recentSales.length === 0 ? (
            <p className="text-text-muted text-sm">Aucune vente enregistrée</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-text">
                      Vente #{sale.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-text-muted">
                      {new Date(sale.date).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <span className="font-semibold text-text">
                    {formatCurrency(sale.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Alertes stock bas</CardTitle>
          {lowStockProducts.length === 0 ? (
            <p className="text-text-muted text-sm">Tous les stocks sont suffisants</p>
          ) : (
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-text">{product.name}</p>
                    <p className="text-xs text-text-muted">{categoryMap.get(product.categoryId) ?? '—'}</p>
                  </div>
                  <span className="text-sm font-semibold text-danger">
                    {product.quantity} / {product.alertThreshold}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
