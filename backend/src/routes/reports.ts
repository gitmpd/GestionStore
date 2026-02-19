import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, requireRole, tid, type AuthRequest } from '../middleware/auth';
import { checkFeature } from '../middleware/quotaGuard';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);
router.use(requireRole('gerant'));
router.use(checkFeature('reports'));

router.get('/summary', async (req: AuthRequest, res) => {
  const { from, to } = req.query;
  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.gte = new Date(from as string);
  if (to) dateFilter.lte = new Date(to as string);

  const where: Record<string, unknown> = { tenantId: tid(req), status: 'completed' as const };
  if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

  const sales = await prisma.sale.findMany({ where, include: { items: true } });

  const totalRevenue = sales.reduce((s, sale) => s + sale.total, 0);
  const totalSales = sales.length;

  let totalProfit = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product) totalProfit += (item.unitPrice - product.buyPrice) * item.quantity;
    }
  }

  const totalCredit = await prisma.customer.aggregate({
    where: { tenantId: tid(req) },
    _sum: { creditBalance: true },
  });
  const allProducts = await prisma.product.findMany({
    where: { tenantId: tid(req) },
    select: { quantity: true, alertThreshold: true },
  });
  const lowStockCount = allProducts.filter((p) => p.quantity <= p.alertThreshold).length;

  res.json({ totalRevenue, totalSales, totalProfit, totalCredit: totalCredit._sum.creditBalance || 0, lowStockCount });
});

router.get('/sales-by-day', async (req: AuthRequest, res) => {
  const { from, to } = req.query;
  const dateFilter: Record<string, unknown> = {};
  if (from) dateFilter.gte = new Date(from as string);
  if (to) dateFilter.lte = new Date(to as string);

  const where: Record<string, unknown> = { tenantId: tid(req), status: 'completed' as const };
  if (Object.keys(dateFilter).length > 0) where.date = dateFilter;

  const sales = await prisma.sale.findMany({ where, orderBy: { date: 'asc' } });

  const byDay = new Map<string, number>();
  sales.forEach((s) => {
    const day = s.date.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + s.total);
  });

  res.json([...byDay.entries()].map(([date, total]) => ({ date, total })));
});

export { router as reportsRouter };
