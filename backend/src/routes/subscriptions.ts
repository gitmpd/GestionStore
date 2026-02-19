import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, tid, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/current', async (req: AuthRequest, res) => {
  if (!tid(req)) {
    res.json(null);
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId: tid(req), status: { in: ['active', 'pending'] } },
    include: { plan: true },
    orderBy: { endDate: 'desc' },
  });

  const tenant = await prisma.tenant.findUnique({ where: { id: tid(req) } });

  res.json({ subscription, tenant });
});

router.post('/request', async (req: AuthRequest, res) => {
  try {
    const { planId, paymentRef } = req.body;
    if (!tid(req)) {
      res.status(400).json({ error: 'Aucune boutique associée' });
      return;
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      res.status(404).json({ error: 'Plan introuvable' });
      return;
    }

    const existingPending = await prisma.subscription.findFirst({
      where: { tenantId: tid(req), status: 'pending' },
    });
    if (existingPending) {
      res.status(409).json({ error: 'Vous avez déjà une demande d\'abonnement en attente' });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const subscription = await prisma.subscription.create({
      data: {
        tenantId: tid(req)!,
        planId,
        status: 'pending',
        startDate,
        endDate,
        paymentRef: paymentRef || null,
      },
      include: { plan: true },
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error('Subscription request error:', err);
    res.status(500).json({ error: 'Erreur lors de la demande d\'abonnement' });
  }
});

export { router as subscriptionsRouter };
