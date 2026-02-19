import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, requireRole, tid, type AuthRequest } from '../middleware/auth';
import { checkFeature } from '../middleware/quotaGuard';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', async (req: AuthRequest, res) => {
  const customers = await prisma.customer.findMany({
    where: { tenantId: tid(req) },
    orderBy: { name: 'asc' },
    include: { creditTransactions: { orderBy: { date: 'desc' }, take: 10 } },
  });
  res.json(customers);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: tid(req) },
    include: {
      creditTransactions: { orderBy: { date: 'desc' } },
      sales: { orderBy: { date: 'desc' }, take: 20 },
    },
  });
  if (!customer) {
    res.status(404).json({ error: 'Client non trouvé' });
    return;
  }
  res.json(customer);
});

router.post('/', async (req: AuthRequest, res) => {
  const customer = await prisma.customer.create({
    data: { ...req.body, tenantId: tid(req) },
  });
  res.status(201).json(customer);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.customer.findFirst({
    where: { id, tenantId: tid(req) },
  });
  if (!existing) { res.status(404).json({ error: 'Non trouvé' }); return; }

  const customer = await prisma.customer.update({
    where: { id },
    data: req.body,
  });
  res.json(customer);
});

router.delete('/:id', requireRole('gerant'), async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.customer.findFirst({ where: { id, tenantId: tid(req) } });
  if (!existing) { res.status(404).json({ error: 'Non trouvé' }); return; }

  await prisma.creditTransaction.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } });
  res.status(204).send();
});

router.post('/:id/credit', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { amount, type, note } = req.body;
  const customer = await prisma.customer.findFirst({
    where: { id, tenantId: tid(req) },
  });
  if (!customer) {
    res.status(404).json({ error: 'Client non trouvé' });
    return;
  }

  const newBalance = type === 'credit'
    ? customer.creditBalance + amount
    : Math.max(0, customer.creditBalance - amount);

  const [updatedCustomer, transaction] = await prisma.$transaction([
    prisma.customer.update({
      where: { id },
      data: { creditBalance: newBalance },
    }),
    prisma.creditTransaction.create({
      data: { tenantId: tid(req), customerId: id, amount, type, note, date: new Date() },
    }),
  ]);

  res.json({ customer: updatedCustomer, transaction });
});

// --- Customer Orders ---

router.get('/orders/all', checkFeature('customer_orders'), async (req: AuthRequest, res) => {
  const orders = await prisma.customerOrder.findMany({
    where: { tenantId: tid(req) },
    orderBy: { date: 'desc' },
    include: { items: true, customer: true },
  });
  res.json(orders);
});

router.post('/:id/orders', checkFeature('customer_orders'), async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { items, deposit, note } = req.body;
  const total = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const order = await prisma.customerOrder.create({
    data: {
      tenantId: tid(req),
      customerId: id,
      total,
      deposit: deposit || 0,
      note: note || null,
      items: { create: items.map((i: any) => ({ ...i, tenantId: tid(req) })) },
    },
    include: { items: true, customer: true },
  });

  res.status(201).json(order);
});

router.patch('/orders/:orderId/deliver', checkFeature('customer_orders'), async (req: AuthRequest, res) => {
  const { paymentMethod } = req.body;
  const orderId = req.params.orderId as string;
  const order = await prisma.customerOrder.findFirst({
    where: { id: orderId, tenantId: tid(req) },
    include: { items: true },
  });

  if (!order) { res.status(404).json({ error: 'Commande non trouvée' }); return; }
  if (order.status !== 'en_attente') { res.status(400).json({ error: 'Seule une commande en attente peut être livrée' }); return; }

  const remaining = order.total - order.deposit;

  const sale = await prisma.sale.create({
    data: {
      tenantId: tid(req),
      userId: req.userId!,
      customerId: order.customerId,
      total: order.total,
      paymentMethod,
      items: {
        create: order.items.map((item) => ({
          tenantId: tid(req),
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
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
        date: sale.date,
        userId: req.userId,
        reason: `Commande client #${order.id.slice(0, 8)}`,
      },
    });
  }

  if (paymentMethod === 'credit' && remaining > 0) {
    await prisma.customer.update({
      where: { id: order.customerId },
      data: { creditBalance: { increment: remaining } },
    });
    await prisma.creditTransaction.create({
      data: {
        tenantId: tid(req),
        customerId: order.customerId,
        saleId: sale.id,
        amount: remaining,
        type: 'credit',
        note: `Commande client #${order.id.slice(0, 8)} (reste après acompte)`,
      },
    });
  }

  const updated = await prisma.customerOrder.update({
    where: { id: orderId },
    data: { status: 'livree', saleId: sale.id },
    include: { items: true, customer: true },
  });

  res.json(updated);
});

router.patch('/orders/:orderId/cancel', checkFeature('customer_orders'), async (req: AuthRequest, res) => {
  const orderId = req.params.orderId as string;
  const order = await prisma.customerOrder.findFirst({
    where: { id: orderId, tenantId: tid(req) },
  });

  if (!order) { res.status(404).json({ error: 'Commande non trouvée' }); return; }
  if (order.status !== 'en_attente') { res.status(400).json({ error: 'Seule une commande en attente peut être annulée' }); return; }

  const updated = await prisma.customerOrder.update({
    where: { id: orderId },
    data: { status: 'annulee' },
    include: { items: true, customer: true },
  });

  res.json(updated);
});

export { router as customersRouter };
