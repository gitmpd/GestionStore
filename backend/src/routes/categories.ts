import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, requireRole, tid, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', async (req: AuthRequest, res) => {
  const categories = await prisma.category.findMany({
    where: { tenantId: tid(req) },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

router.get('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const category = await prisma.category.findFirst({
    where: { id, tenantId: tid(req) },
    include: { products: true },
  });
  if (!category) {
    res.status(404).json({ error: 'Catégorie non trouvée' });
    return;
  }
  res.json(category);
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const category = await prisma.category.create({
      data: { name: req.body.name, tenantId: tid(req) },
    });
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Cette catégorie existe déjà' });
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.category.findFirst({
    where: { id, tenantId: tid(req) },
  });
  if (!existing) { res.status(404).json({ error: 'Non trouvée' }); return; }

  const category = await prisma.category.update({
    where: { id },
    data: { name: req.body.name },
  });
  res.json(category);
});

router.delete('/:id', requireRole('gerant'), async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const existing = await prisma.category.findFirst({ where: { id, tenantId: tid(req) } });
  if (!existing) { res.status(404).json({ error: 'Non trouvée' }); return; }

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    res.status(400).json({
      error: `Impossible de supprimer : ${productCount} produit(s) utilisent cette catégorie`,
    });
    return;
  }
  await prisma.category.delete({ where: { id } });
  res.status(204).send();
});

export { router as categoriesRouter };
