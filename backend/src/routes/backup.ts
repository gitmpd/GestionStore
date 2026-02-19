import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, requireRole, tid, type AuthRequest } from '../middleware/auth';
import { checkFeature } from '../middleware/quotaGuard';

const router = Router();

const tables = [
  'user', 'category', 'product', 'customer', 'supplier',
  'sale', 'saleItem', 'supplierOrder', 'orderItem',
  'stockMovement', 'creditTransaction', 'expense',
  'customerOrder', 'customerOrderItem', 'auditLog', 'priceHistory',
] as const;

router.get('/export', authenticate, tenantGuard, requireRole('gerant', 'super_admin'), checkFeature('backup'), async (req: AuthRequest, res) => {
  try {
    const data: Record<string, unknown[]> = {};
    const where = tid(req) ? { tenantId: tid(req) } : {};

    for (const table of tables) {
      data[table] = await (prisma[table] as any).findMany({ where });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=gestionstore_backup_${new Date().toISOString().slice(0, 10)}.json`);
    res.json({ version: '1.0', exportedAt: new Date().toISOString(), data });
  } catch (err) {
    console.error('Backup export error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

router.post('/import', authenticate, tenantGuard, requireRole('gerant', 'super_admin'), checkFeature('backup'), async (req: AuthRequest, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Format de sauvegarde invalide' });
      return;
    }

    const importOrder = [
      'user', 'category', 'supplier', 'customer',
      'product', 'priceHistory', 'sale', 'saleItem',
      'supplierOrder', 'orderItem',
      'stockMovement', 'creditTransaction', 'expense',
      'customerOrder', 'customerOrderItem', 'auditLog',
    ] as const;

    let imported = 0;

    await prisma.$transaction(async (tx) => {
      for (const table of importOrder) {
        const rows = data[table];
        if (!Array.isArray(rows) || rows.length === 0) continue;

        for (const row of rows) {
          try {
            if (tid(req) && !row.tenantId) row.tenantId = tid(req);
            await (tx[table] as any).upsert({
              where: { id: row.id },
              update: row,
              create: row,
            });
            imported++;
          } catch {
            // skip individual row errors
          }
        }
      }
    });

    res.json({ message: `Import terminé : ${imported} enregistrement(s) traités` });
  } catch (err) {
    console.error('Backup import error:', err);
    res.status(500).json({ error: 'Erreur lors de l\'import' });
  }
});

export { router as backupRouter };
