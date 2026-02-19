import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { tid, type AuthRequest } from './auth';

async function getActivePlan(tenantId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId, status: 'active' },
    include: { plan: true },
    orderBy: { endDate: 'desc' },
  });
  return sub?.plan ?? null;
}

async function isInTrial(tenantId: string): Promise<boolean> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant?.trialEndsAt) return false;
  return tenant.trialEndsAt > new Date();
}

const FEATURE_MAP: Record<string, string> = {
  customer_orders: 'Commandes clients',
  csv_export: 'Export CSV',
  audit: "Journal d'audit",
  backup: 'Sauvegarde & restauration',
  reports: 'Rapports avancés',
};

export function checkFeature(featureKey: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.userRole === 'super_admin') { next(); return; }

    const tenantId = tid(req);
    if (!tenantId) { next(); return; }

    const featureLabel = FEATURE_MAP[featureKey] || featureKey;

    (async () => {
      const plan = await getActivePlan(tenantId);

      if (!plan) {
        const trial = await isInTrial(tenantId);
        if (trial) { next(); return; }
        res.status(403).json({ error: 'Abonnement requis' });
        return;
      }

      const features: string[] = Array.isArray(plan.features) ? (plan.features as string[]) : [];
      if (features.includes('Toutes les fonctionnalités') || features.includes(featureLabel)) {
        next();
        return;
      }

      res.status(403).json({
        error: `La fonctionnalité "${featureLabel}" n'est pas incluse dans votre plan ${plan.name}. Passez à un plan supérieur.`,
        code: 'FEATURE_RESTRICTED',
        feature: featureKey,
        currentPlan: plan.name,
      });
    })().catch(() => {
      res.status(500).json({ error: 'Erreur de vérification des fonctionnalités' });
    });
  };
}

export function checkProductQuota(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole === 'super_admin') { next(); return; }
  const tenantId = tid(req);
  if (!tenantId) { next(); return; }

  (async () => {
    const plan = await getActivePlan(tenantId);
    const maxProducts = plan?.maxProducts ?? 50; // trial default

    if (!plan) {
      const trial = await isInTrial(tenantId);
      if (!trial) {
        res.status(403).json({ error: 'Abonnement requis pour ajouter des produits' });
        return;
      }
    }

    if (maxProducts > 0) {
      const count = await prisma.product.count({ where: { tenantId } });
      if (count >= maxProducts) {
        res.status(403).json({
          error: `Limite atteinte : ${maxProducts} produits maximum pour votre plan. Passez à un plan supérieur.`,
          code: 'QUOTA_EXCEEDED',
          limit: maxProducts,
          current: count,
        });
        return;
      }
    }

    next();
  })().catch(() => {
    res.status(500).json({ error: 'Erreur de vérification des quotas' });
  });
}

export function checkUserQuota(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole === 'super_admin') { next(); return; }
  const tenantId = tid(req);
  if (!tenantId) { next(); return; }

  (async () => {
    const plan = await getActivePlan(tenantId);
    const maxUsers = plan?.maxUsers ?? 2; // trial default

    if (!plan) {
      const trial = await isInTrial(tenantId);
      if (!trial) {
        res.status(403).json({ error: 'Abonnement requis pour ajouter des utilisateurs' });
        return;
      }
    }

    if (maxUsers > 0) {
      const count = await prisma.user.count({ where: { tenantId, active: true } });
      if (count >= maxUsers) {
        res.status(403).json({
          error: `Limite atteinte : ${maxUsers} utilisateurs maximum pour votre plan. Passez à un plan supérieur.`,
          code: 'QUOTA_EXCEEDED',
          limit: maxUsers,
          current: count,
        });
        return;
      }
    }

    next();
  })().catch(() => {
    res.status(500).json({ error: 'Erreur de vérification des quotas' });
  });
}
