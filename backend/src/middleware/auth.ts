import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
  tenantId?: string;
}

export function tid(req: AuthRequest): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return String((req as any)._tenantId || '') || undefined;
}

/**
 * Returns a Prisma-compatible where clause for tenant scoping.
 * - Gérant/Vendeur: filters by their own tenantId
 * - Super-admin with ?tenantId query param: filters by that tenant
 * - Super-admin without param: returns {} (all tenants)
 */
export function tWhere(req: AuthRequest): Record<string, string> {
  const t = tid(req) || (req.query.tenantId as string);
  return t ? { tenantId: t } : {};
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      role: string;
      tenantId?: string;
    };
    req.userId = payload.userId;
    req.userRole = payload.role;
    (req as any)._tenantId = payload.tenantId;
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    next();
  };
}

export function tenantGuard(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole === 'super_admin') {
    next();
    return;
  }

  const tenantId = tid(req);
  if (!tenantId) {
    res.status(403).json({ error: 'Aucune boutique associée à ce compte' });
    return;
  }

  prisma.tenant
    .findUnique({ where: { id: tenantId } })
    .then((tenant) => {
      if (!tenant) {
        res.status(404).json({ error: 'Boutique introuvable' });
        return;
      }
      if (tenant.status === 'suspended') {
        res.status(403).json({ error: 'Votre boutique est suspendue. Contactez le support.' });
        return;
      }
      if (tenant.status === 'expired') {
        const now = new Date();
        if (tenant.trialEndsAt && tenant.trialEndsAt < now) {
          res.status(403).json({ error: 'Votre période d\'essai a expiré. Veuillez souscrire à un abonnement.' });
          return;
        }
      }
      next();
    })
    .catch(() => {
      res.status(500).json({ error: 'Erreur de vérification du tenant' });
    });
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'super_admin') {
    res.status(403).json({ error: 'Accès réservé au super-administrateur' });
    return;
  }
  next();
}
