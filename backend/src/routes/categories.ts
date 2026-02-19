import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(categories);
});

router.get('/:id', async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { id: req.params.id },
    include: { products: true },
  });
  if (!category) {
    res.status(404).json({ error: 'Catégorie non trouvée' });
    return;
  }
  res.json(category);
});

router.post('/', async (req, res) => {
  try {
    const category = await prisma.category.create({ data: { name: req.body.name } });
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Cette catégorie existe déjà' });
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { name: req.body.name },
  });
  res.json(category);
});

router.delete('/:id', async (req, res) => {
  const productCount = await prisma.product.count({
    where: { categoryId: req.params.id },
  });
  if (productCount > 0) {
    res.status(400).json({
      error: `Impossible de supprimer : ${productCount} produit(s) utilisent cette catégorie`,
    });
    return;
  }
  await prisma.category.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export { router as categoriesRouter };
