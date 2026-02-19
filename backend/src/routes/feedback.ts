import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, tid, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const feedbacks = await prisma.feedback.findMany({
      where: { tenantId: tid(req) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(feedbacks);
  } catch (err) {
    console.error('Feedback list error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { type, subject, message } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Le sujet et le message sont requis' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId! }, select: { name: true } });

    const feedback = await prisma.feedback.create({
      data: {
        tenantId: tid(req),
        userId: req.userId!,
        userName: user?.name ?? 'Inconnu',
        type: type || 'plainte',
        subject: subject.trim(),
        message: message.trim(),
      },
    });

    res.status(201).json(feedback);
  } catch (err) {
    console.error('Feedback create error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export { router as feedbackRouter };
