import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, requireRole, tid, type AuthRequest } from '../middleware/auth';
import { checkProductQuota } from '../middleware/quotaGuard';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', async (req: AuthRequest, res) => {
  const products = await prisma.product.findMany({
    where: { tenantId: tid(req) },
    orderBy: { name: 'asc' },
  });
  res.json(products);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const product = await prisma.product.findFirst({
    where: { id, tenantId: tid(req) },
  });
  if (!product) {
    res.status(404).json({ error: 'Produit non trouvé' });
    return;
  }
  res.json(product);
});

router.post('/', checkProductQuota, async (req: AuthRequest, res) => {
  const product = await prisma.product.create({
    data: { ...req.body, tenantId: tid(req) },
  });
  res.status(201).json(product);
});

router.put('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.product.findFirst({
    where: { id, tenantId: tid(req) },
  });
  if (!existing) { res.status(404).json({ error: 'Non trouvé' }); return; }

  const product = await prisma.product.update({
    where: { id },
    data: req.body,
  });
  res.json(product);
});

router.delete('/:id', requireRole('gerant'), async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.product.findFirst({ where: { id, tenantId: tid(req) } });
  if (!existing) { res.status(404).json({ error: 'Non trouvé' }); return; }

  await prisma.product.delete({ where: { id } });
  res.status(204).send();
});

export { router as productsRouter };
