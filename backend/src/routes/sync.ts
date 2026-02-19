import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, tenantGuard, tid, type AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(tenantGuard);

interface SyncPayload {
  table: string;
  records: Record<string, unknown>[];
  deletions?: string[];
  lastSyncedAt?: string;
}

const tableMap: Record<string, any> = {
  users: 'user',
  categories: 'category',
  products: 'product',
  customers: 'customer',
  suppliers: 'supplier',
  sales: 'sale',
  saleItems: 'saleItem',
  supplierOrders: 'supplierOrder',
  orderItems: 'orderItem',
  stockMovements: 'stockMovement',
  creditTransactions: 'creditTransaction',
  auditLogs: 'auditLog',
  expenses: 'expense',
  customerOrders: 'customerOrder',
  customerOrderItems: 'customerOrderItem',
  priceHistory: 'priceHistory',
};

const tablesWithoutUpdatedAt = new Set(['priceHistory']);

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { changes }: { changes: SyncPayload[] } = req.body;
    const results: Record<string, { pushed: number; deleted: number; pulled: Record<string, unknown>[] }> = {};

    for (const { table, records, deletions, lastSyncedAt } of changes) {
      const modelName = tableMap[table];
      if (!modelName) continue;

      const model = (prisma as any)[modelName];
      let pushed = 0;
      let deleted = 0;

      try {
        if (deletions && deletions.length > 0) {
          for (const recordId of deletions) {
            try {
              await model.delete({ where: { id: recordId } });
              deleted++;
            } catch (err) {
              console.error(`Sync delete error for ${table}/${recordId}:`, (err as Error).message);
            }
          }
        }

        for (const record of records) {
          const { syncStatus, lastSyncedAt: _, ...data } = record as any;
          if (tid(req) && !data.tenantId) {
            data.tenantId = tid(req);
          }
          try {
            await model.upsert({
              where: { id: data.id },
              update: { ...data, syncStatus: 'synced', lastSyncedAt: new Date() },
              create: { ...data, syncStatus: 'synced', lastSyncedAt: new Date() },
            });
            pushed++;
          } catch (err) {
            console.error(`Sync push error for ${table}:`, (err as Error).message);
          }
        }

        const pullWhere: Record<string, unknown> = {};
        if (tid(req)) pullWhere.tenantId = tid(req);
        if (lastSyncedAt) {
          const dateField = tablesWithoutUpdatedAt.has(table) ? 'createdAt' : 'updatedAt';
          pullWhere[dateField] = { gt: new Date(lastSyncedAt) };
        }

        const pulled = await model.findMany({ where: pullWhere });
        results[table] = { pushed, deleted, pulled };
      } catch (err) {
        console.error(`Sync error for table ${table}:`, (err as Error).message);
        results[table] = { pushed, deleted, pulled: [] };
      }
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Erreur de synchronisation' });
  }
});

router.get('/status', async (req: AuthRequest, res) => {
  const counts: Record<string, number> = {};
  for (const [tableName, modelName] of Object.entries(tableMap)) {
    try {
      counts[tableName] = await (prisma as any)[modelName].count({
        where: tid(req) ? { tenantId: tid(req) } : {},
      });
    } catch {
      counts[tableName] = 0;
    }
  }
  res.json(counts);
});

export { router as syncRouter };
