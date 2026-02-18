import { db } from '@/db';
import { useAuthStore } from '@/stores/authStore';

const TABLES = [
  'users',
  'categories',
  'products',
  'customers',
  'suppliers',
  'sales',
  'saleItems',
  'supplierOrders',
  'orderItems',
  'stockMovements',
  'creditTransactions',
  'auditLogs',
  'expenses',
] as const;

type TableName = (typeof TABLES)[number];

function getTable(name: TableName) {
  return db[name];
}

function getServerUrl(): string {
  return localStorage.getItem('sync_server_url') || '';
}

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function syncAll(): Promise<{ success: boolean; error?: string }> {
  const serverUrl = getServerUrl();
  if (!serverUrl) return { success: false, error: 'Serveur non configuré' };
  if (!navigator.onLine) return { success: false, error: 'Hors ligne' };

  try {
    const changes = [];

    for (const tableName of TABLES) {
      const table = getTable(tableName);
      const pendingRecords = await table.where('syncStatus').equals('pending').toArray();
      const lastSync = localStorage.getItem(`lastSync_${tableName}`);

      changes.push({
        table: tableName,
        records: pendingRecords,
        lastSyncedAt: lastSync || undefined,
      });
    }

    const res = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ changes }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const now = new Date().toISOString();
    for (const tableName of TABLES) {
      const result = data.results?.[tableName];
      if (!result) continue;

      const table = getTable(tableName);
      const pending = await table.where('syncStatus').equals('pending').toArray();
      for (const record of pending) {
        await table.update((record as { id: string }).id, {
          syncStatus: 'synced',
          lastSyncedAt: now,
        } as never);
      }

      for (const remote of result.pulled) {
        await table.put(remote as never);
      }

      localStorage.setItem(`lastSync_${tableName}`, now);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getPendingCount(): Promise<number> {
  let count = 0;
  for (const tableName of TABLES) {
    count += await getTable(tableName).where('syncStatus').equals('pending').count();
  }
  return count;
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30000) {
  stopAutoSync();
  syncInterval = setInterval(() => {
    if (navigator.onLine && getServerUrl()) {
      syncAll().catch(console.error);
    }
  }, intervalMs);
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}
