import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { authenticate, requireSuperAdmin, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin);

// ── Dashboard Stats ──

router.get('/stats', async (_req, res) => {
  const [totalTenants, activeTenants, suspendedTenants, expiredTenants, pendingSubs, activeSubsCount] =
    await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'active' } }),
      prisma.tenant.count({ where: { status: 'suspended' } }),
      prisma.tenant.count({ where: { status: 'expired' } }),
      prisma.subscription.count({ where: { status: 'pending' } }),
      prisma.subscription.count({ where: { status: 'active' } }),
    ]);

  const activeSubs = await prisma.subscription.findMany({
    where: { status: 'active' },
    include: { plan: true },
  });
  const totalRevenue = activeSubs.reduce((sum, s) => sum + s.plan.price, 0);

  res.json({
    totalTenants,
    activeTenants,
    suspendedTenants,
    expiredTenants,
    pendingSubs,
    activeSubsCount,
    totalRevenue,
  });
});

// ── Tenants CRUD ──

router.get('/tenants', async (req, res) => {
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const tenants = await prisma.tenant.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      subscriptions: {
        where: { status: { in: ['active', 'pending'] } },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      _count: { select: { users: true, products: true, sales: true } },
    },
  });

  res.json(tenants);
});

router.patch('/tenants/:id', async (req, res) => {
  const { status } = req.body;
  const tenant = await prisma.tenant.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json(tenant);
});

router.delete('/tenants/:id', async (req, res) => {
  const id = req.params.id;
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) { res.status(404).json({ error: 'Boutique introuvable' }); return; }

  res.json({ message: 'Boutique supprimée. Les données ont été archivées.' });
});

// ── Tenant Owner / Password Reset ──

router.get('/tenants/:id/owner', async (req, res) => {
  const id = req.params.id as string;
  const owner = await prisma.user.findFirst({
    where: { tenantId: id, role: 'gerant' },
    select: { id: true, name: true, email: true, active: true, mustChangePassword: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner) { res.status(404).json({ error: 'Aucun gérant trouvé pour cette boutique' }); return; }
  res.json(owner);
});

router.post('/tenants/:id/reset-owner-password', async (req: AuthRequest, res) => {
  const tenantId = req.params.id as string;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    return;
  }

  const owner = await prisma.user.findFirst({
    where: { tenantId, role: 'gerant' },
    orderBy: { createdAt: 'asc' },
  });
  if (!owner) { res.status(404).json({ error: 'Aucun gérant trouvé' }); return; }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: owner.id },
    data: { password: hashed, mustChangePassword: true },
  });

  res.json({ message: `Mot de passe réinitialisé pour ${owner.name} (${owner.email}). Il devra le changer à la prochaine connexion.` });
});

// ── Subscriptions Management ──

router.get('/subscriptions', async (req, res) => {
  const status = req.query.status as string | undefined;
  const where: any = {};
  if (status && status !== 'all') where.status = status;

  const subs = await prisma.subscription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { tenant: true, plan: true },
  });
  res.json(subs);
});

router.patch('/subscriptions/:id/validate', async (req: AuthRequest, res) => {
  try {
    const subId = req.params.id as string;
    const sub = await prisma.subscription.findUnique({
      where: { id: subId },
      include: { plan: true },
    });
    if (!sub) { res.status(404).json({ error: 'Abonnement introuvable' }); return; }
    if (sub.status !== 'pending') { res.status(400).json({ error: 'Cet abonnement n\'est pas en attente' }); return; }

    await prisma.subscription.updateMany({
      where: { tenantId: sub.tenantId, status: 'active' },
      data: { status: 'expired' },
    });

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (sub as any).plan.durationDays);

    const updated = await prisma.subscription.update({
      where: { id: subId },
      data: {
        status: 'active',
        startDate,
        endDate,
        validatedBy: req.userId as string,
        validatedAt: new Date(),
      },
      include: { tenant: true, plan: true },
    });

    await prisma.tenant.update({
      where: { id: sub.tenantId },
      data: { status: 'active', trialEndsAt: null },
    });

    res.json(updated);
  } catch (err) {
    console.error('Subscription validate error:', err);
    res.status(500).json({ error: 'Erreur lors de la validation' });
  }
});

router.patch('/subscriptions/:id/reject', async (_req, res) => {
  const updated = await prisma.subscription.update({
    where: { id: _req.params.id },
    data: { status: 'cancelled' },
    include: { tenant: true, plan: true },
  });
  res.json(updated);
});

// ── Feedbacks Management ──

router.get('/feedbacks', async (req, res) => {
  const status = req.query.status as string | undefined;
  const type = req.query.type as string | undefined;
  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (type && type !== 'all') where.type = type;

  const feedbacks = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { tenant: { select: { name: true, slug: true } } },
  });
  res.json(feedbacks);
});

router.patch('/feedbacks/:id/reply', async (req: AuthRequest, res) => {
  const id = req.params.id as string;
  const { reply, status } = req.body;

  if (!reply?.trim()) {
    res.status(400).json({ error: 'La réponse est requise' });
    return;
  }

  try {
    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        adminReply: reply.trim(),
        repliedAt: new Date(),
        status: status || 'resolu',
      },
    });
    res.json(feedback);
  } catch (err) {
    console.error('Feedback reply error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/feedbacks/:id/status', async (req, res) => {
  const id = req.params.id as string;
  const { status } = req.body;
  try {
    const feedback = await prisma.feedback.update({
      where: { id },
      data: { status },
    });
    res.json(feedback);
  } catch (err) {
    console.error('Feedback status error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Plans Management ──

router.get('/plans', async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(plans);
});

router.post('/plans', async (req, res) => {
  const plan = await prisma.plan.create({ data: req.body });
  res.status(201).json(plan);
});

router.put('/plans/:id', async (req, res) => {
  const plan = await prisma.plan.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(plan);
});

router.delete('/plans/:id', async (req, res) => {
  const id = req.params.id as string;
  try {
    const subsCount = await prisma.subscription.count({ where: { planId: id } });
    if (subsCount > 0) {
      await prisma.plan.update({ where: { id }, data: { active: false } });
      res.json({ message: 'Plan désactivé (des abonnements y sont liés)', deactivated: true });
      return;
    }
    await prisma.plan.delete({ where: { id } });
    res.json({ message: 'Plan supprimé' });
  } catch (err) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export { router as adminRouter };
