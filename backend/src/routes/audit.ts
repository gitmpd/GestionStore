import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, requireRole, tid, type AuthRequest } from '../middleware/auth';
import { checkFeature } from '../middleware/quotaGuard';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', requireRole('gerant', 'super_admin'), checkFeature('audit'), async (req: AuthRequest, res) => {
  try {
    const { userId, action, entity, from, to, limit = '100', offset = '0' } = req.query;

    const where: Record<string, unknown> = {};
    if (tid(req)) where.tenantId = tid(req);
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from as string);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to as string);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { date: 'desc' },
        take: Math.min(Number(limit), 500),
        skip: Number(offset),
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total });
  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du journal' });
  }
});

export { router as auditRouter };
