import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, tid, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/me', async (req: AuthRequest, res) => {
  const tenantId = tid(req);
  if (!tenantId) {
    res.json(null);
    return;
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    res.status(404).json({ error: 'Boutique introuvable' });
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId, status: 'active' },
    include: { plan: true },
    orderBy: { endDate: 'desc' },
  });

  const [productCount, userCount, saleCount] = await Promise.all([
    prisma.product.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, active: true } }),
    prisma.sale.count({ where: { tenantId } }),
  ]);

  res.json({
    tenant,
    subscription,
    usage: { products: productCount, users: userCount, sales: saleCount },
    limits: subscription?.plan
      ? { maxProducts: subscription.plan.maxProducts, maxUsers: subscription.plan.maxUsers, maxSales: subscription.plan.maxSales }
      : { maxProducts: 50, maxUsers: 2, maxSales: 0 },
  });
});

router.patch('/update-name', async (req: AuthRequest, res) => {
  const tenantId = tid(req);
  if (!tenantId) {
    res.status(403).json({ error: 'Aucune boutique associée' });
    return;
  }

  if (req.userRole !== 'gerant' && req.userRole !== 'super_admin') {
    res.status(403).json({ error: 'Seul le gérant peut modifier le nom de la boutique' });
    return;
  }

  const { name } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'Le nom est requis' });
    return;
  }

  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      res.status(404).json({ error: 'Boutique introuvable' });
      return;
    }

    const oldName = tenant.name;
    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } });

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { name: name.trim() },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.userId!,
        userName: user?.name ?? 'Inconnu',
        action: 'modification',
        entity: 'boutique',
        entityId: tenantId,
        entityName: name.trim(),
        details: `Nom de boutique modifié : "${oldName}" → "${name.trim()}"`,
        date: new Date(),
      },
    });

    res.json({ id: updated.id, name: updated.name, slug: updated.slug });
  } catch (err) {
    console.error('Erreur update tenant name:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export { router as tenantRouter };
