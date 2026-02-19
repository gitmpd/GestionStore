import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, tid, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', async (req: AuthRequest, res) => {
  const { from, to } = req.query;
  const where: Record<string, unknown> = { tenantId: tid(req) };
  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, unknown>).gte = new Date(from as string);
    if (to) (where.date as Record<string, unknown>).lte = new Date(to as string);
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { items: true, customer: true },
  });
  res.json(sales);
});

router.post('/', async (req: AuthRequest, res) => {
  const { items, customerId, paymentMethod } = req.body;
  const total = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const sale = await prisma.sale.create({
    data: {
      tenantId: tid(req),
      userId: req.userId!,
      customerId: customerId || null,
      total,
      paymentMethod,
      items: {
        create: items.map((i: any) => ({ ...i, tenantId: tid(req) })),
      },
    },
    include: { items: true },
  });

  for (const item of sale.items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { quantity: { decrement: item.quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        tenantId: tid(req),
        productId: item.productId,
        productName: item.productName,
        type: 'sortie',
        quantity: item.quantity,
        reason: `Vente #${sale.id.slice(0, 8)}`,
      },
    });
  }

  if (paymentMethod === 'credit' && customerId) {
    await prisma.customer.update({
      where: { id: customerId },
      data: { creditBalance: { increment: total } },
    });
    await prisma.creditTransaction.create({
      data: {
        tenantId: tid(req),
        customerId,
        saleId: sale.id,
        amount: total,
        type: 'credit',
        note: `Vente #${sale.id.slice(0, 8)}`,
      },
    });
  }

  res.status(201).json(sale);
});

export { router as salesRouter };
