import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const plans = await prisma.plan.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });
  res.json(plans);
});

export { router as plansRouter };
