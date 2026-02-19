import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { authenticate, tid, type AuthRequest } from '../middleware/auth';
import { checkUserQuota } from '../middleware/quotaGuard';

const router = Router();

function generateTokens(userId: string, role: string, tenantId?: string) {
  const payload: Record<string, unknown> = { userId, role };
  if (tenantId) payload.tenantId = tenantId;
  const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '24h' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
  return { token, refreshToken };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Public registration — creates tenant + owner user + trial
router.post('/public-register', async (req, res) => {
  try {
    const { storeName, name, email, password } = req.body;

    if (!storeName || !name || !email || !password) {
      res.status(400).json({ error: 'Tous les champs sont requis' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Cet email est déjà utilisé' });
      return;
    }

    let slug = slugify(storeName);
    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: storeName, slug, status: 'active', trialEndsAt },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'gerant',
          tenantId: tenant.id,
          mustChangePassword: false,
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { ownerUserId: user.id },
      });

      return { tenant, user };
    });

    const tokens = generateTokens(result.user.id, result.user.role, result.tenant.id);
    const { password: _, ...safeUser } = result.user;

    res.status(201).json({
      ...tokens,
      user: safeUser,
      tenant: result.tenant,
    });
  } catch (err) {
    console.error('Public register error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      res.status(401).json({ error: 'Identifiants invalides' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Identifiants invalides' });
      return;
    }

    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
      if (tenant?.status === 'suspended') {
        res.status(403).json({ error: 'Votre boutique est suspendue. Contactez le support.' });
        return;
      }
    }

    const tokens = generateTokens(user.id, user.role, user.tenantId ?? undefined);
    const { password: _, ...safeUser } = user;

    let tenant = null;
    if (user.tenantId) {
      tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    }

    res.json({ ...tokens, user: safeUser, tenant });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  try {
    const { newPassword, name } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const updateData: Record<string, unknown> = { password: hashedPassword, mustChangePassword: false };
    if (name && name.trim()) updateData.name = name.trim();

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
    });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/register', authenticate, checkUserQuota, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'gerant') {
      res.status(403).json({ error: 'Seul un gérant peut créer des comptes' });
      return;
    }

    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'vendeur',
        tenantId: tid(req),
        mustChangePassword: true,
      },
    });

    const { password: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Cet email existe déjà' });
      return;
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as {
      userId: string;
      role: string;
      tenantId?: string;
    };
    const tokens = generateTokens(payload.userId, payload.role, payload.tenantId);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Refresh token invalide' });
  }
});

router.get('/users', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'gerant' && req.userRole !== 'super_admin') {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    const where: Record<string, unknown> = {};
    if (req.userRole === 'super_admin') {
      // Super-admin sees all users (optionally filtered by query params)
    } else {
      where.tenantId = tid(req);
      where.role = { not: 'super_admin' };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, email: true, role: true, active: true,
        tenantId: true, mustChangePassword: true,
        createdAt: true, updatedAt: true, syncStatus: true, lastSyncedAt: true,
      },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.patch('/users/:id/toggle', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'gerant' && req.userRole !== 'super_admin') {
      res.status(403).json({ error: 'Accès refusé' });
      return;
    }
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    if (req.userRole !== 'super_admin' && user.tenantId !== tid(req)) {
      res.status(403).json({ error: 'Accès refusé : cet utilisateur ne fait pas partie de votre boutique' });
      return;
    }
    if (user.id === req.userId) {
      res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte' });
      return;
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { active: !user.active },
      select: {
        id: true, name: true, email: true, role: true, active: true,
        tenantId: true, mustChangePassword: true,
        createdAt: true, updatedAt: true, syncStatus: true, lastSyncedAt: true,
      },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/users/:id/reset-password', authenticate, async (req: AuthRequest, res) => {
  try {
    if (req.userRole !== 'gerant' && req.userRole !== 'super_admin') {
      res.status(403).json({ error: 'Seul un gérant peut réinitialiser les mots de passe' });
      return;
    }
    const id = req.params.id as string;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    if (req.userRole !== 'super_admin' && user.tenantId !== tid(req)) {
      res.status(403).json({ error: 'Accès refusé : cet utilisateur ne fait pas partie de votre boutique' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword, mustChangePassword: true },
    });

    res.json({ message: 'Mot de passe réinitialisé.' });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      res.status(404).json({ error: 'Utilisateur non trouvé' });
      return;
    }
    const { password: _, ...safeUser } = user;

    let tenant = null;
    if (user.tenantId) {
      tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        include: {
          subscriptions: {
            where: { status: 'active' },
            include: { plan: true },
            orderBy: { endDate: 'desc' },
            take: 1,
          },
        },
      });
    }

    res.json({ user: safeUser, tenant });
  } catch {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export { router as authRouter };
