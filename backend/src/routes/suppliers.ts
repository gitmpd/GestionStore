import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, requireRole, tid, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);
router.use(requireRole('gerant'));

router.get('/', async (req: AuthRequest, res) => {
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId: tid(req) },
    orderBy: { name: 'asc' },
  });
  res.json(suppliers);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: tid(req) },
    include: { orders: { orderBy: { date: 'desc' }, include: { items: true } } },
  });
  if (!supplier) { res.status(404).json({ error: 'Fournisseur non trouvé' }); return; }
  res.json(supplier);
});

router.post('/', async (req: AuthRequest, res) => {
  const supplier = await prisma.supplier.create({
    data: { ...req.body, tenantId: tid(req) },
  });
  res.status(201).json(supplier);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.supplier.findFirst({ where: { id, tenantId: tid(req) } });
  if (!existing) { res.status(404).json({ error: 'Non trouvé' }); return; }

  const supplier = await prisma.supplier.update({
    where: { id },
    data: req.body,
  });
  res.json(supplier);
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.supplier.findFirst({ where: { id, tenantId: tid(req) } });
  if (!existing) { res.status(404).json({ error: 'Non trouvé' }); return; }
  await prisma.supplier.delete({ where: { id } });
  res.status(204).send();
});

router.post('/:id/orders', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { items } = req.body;
  const total = items.reduce(
    (sum: number, item: { quantity: number; unitPrice: number }) =>
      sum + item.quantity * item.unitPrice,
    0
  );

  const order = await prisma.supplierOrder.create({
    data: {
      tenantId: tid(req),
      supplierId: id,
      total,
      items: { create: items.map((i: any) => ({ ...i, tenantId: tid(req) })) },
    },
    include: { items: true },
  });

  res.status(201).json(order);
});

router.post('/orders/:orderId/receive', async (req: AuthRequest, res) => {
  const orderId = req.params.orderId as string;
  const order = await prisma.supplierOrder.findFirst({
    where: { id: orderId, tenantId: tid(req) },
    include: { items: true },
  });

  if (!order) { res.status(404).json({ error: 'Commande non trouvée' }); return; }

  for (const item of (order as any).items) {
    await prisma.product.update({
      where: { id: item.productId },
      data: { quantity: { increment: item.quantity } },
    });
    await prisma.stockMovement.create({
      data: {
        tenantId: tid(req),
        productId: item.productId,
        productName: item.productName,
        type: 'entree',
        quantity: item.quantity,
        reason: `Réception commande #${order.id.slice(0, 8)}`,
      },
    });
  }

  const updated = await prisma.supplierOrder.update({
    where: { id: orderId },
    data: { status: 'recue' },
    include: { items: true },
  });

  res.json(updated);
});

export { router as suppliersRouter };
