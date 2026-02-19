import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, type AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

interface SyncPayload {
  table: string;
  records: Record<string, unknown>[];
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
};

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { changes }: { changes: SyncPayload[] } = req.body;
    const results: Record<string, { pushed: number; pulled: Record<string, unknown>[] }> = {};

    for (const { table, records, lastSyncedAt } of changes) {
      const modelName = tableMap[table];
      if (!modelName) continue;

      const model = (prisma as any)[modelName];
      let pushed = 0;

      for (const record of records) {
        const { syncStatus, lastSyncedAt: _, ...data } = record as any;
        try {
          await model.upsert({
            where: { id: data.id },
            update: { ...data, syncStatus: 'synced', lastSyncedAt: new Date() },
            create: { ...data, syncStatus: 'synced', lastSyncedAt: new Date() },
          });
          pushed++;
        } catch (err) {
          console.error(`Sync error for ${table}:`, (err as Error).message);
        }
      }

      const pullWhere: Record<string, unknown> = {};
      if (lastSyncedAt) {
        pullWhere.updatedAt = { gt: new Date(lastSyncedAt) };
      }

      const pulled = await model.findMany({ where: pullWhere });
      results[table] = { pushed, pulled };
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ error: 'Erreur de synchronisation' });
  }
});

router.get('/status', async (_req, res) => {
  const counts: Record<string, number> = {};
  for (const [tableName, modelName] of Object.entries(tableMap)) {
    try {
      counts[tableName] = await (prisma as any)[modelName].count();
    } catch {
      counts[tableName] = 0;
    }
  }
  res.json(counts);
});

export { router as syncRouter };
