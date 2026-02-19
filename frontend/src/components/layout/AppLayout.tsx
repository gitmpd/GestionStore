import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { startAutoSync, stopAutoSync, syncAll } from '@/services/syncService';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/db';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const token = useAuthStore((s) => s.token);
  const tenant = useAuthStore((s) => s.tenant);
  const isOfflineToken = !token || token === 'offline-token';

  const trialDaysLeft = tenant?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;
  const trialExpired = trialDaysLeft !== null && trialDaysLeft <= 0;
  const trialWarning = trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 3;

  useEffect(() => {
    (async () => {
      const localCount = await db.products.count();
      await syncAll(localCount === 0 ? { force: true } : undefined);
      startAutoSync();
    })();
    return () => stopAutoSync();
  }, []);

  return (
    <div className="flex h-screen bg-surface-alt">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        {isOfflineToken && (
          <div className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-sm px-4 py-2 flex items-center gap-2">
            <AlertTriangle size={16} />
            Mode hors-ligne — déconnectez-vous et reconnectez-vous avec le serveur accessible pour synchroniser les données.
          </div>
        )}
        {trialExpired && (
          <Link
            to="/subscription"
            className="bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 text-sm px-4 py-2 flex items-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/70 transition-colors"
          >
            <AlertTriangle size={16} />
            Votre période d'essai a expiré. Cliquez ici pour souscrire à un abonnement.
          </Link>
        )}
        {trialWarning && (
          <Link
            to="/subscription"
            className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-sm px-4 py-2 flex items-center gap-2 hover:bg-amber-200 dark:hover:bg-amber-900/70 transition-colors"
          >
            <Clock size={16} />
            Votre essai expire dans {trialDaysLeft} jour(s). Cliquez ici pour choisir un abonnement.
          </Link>
        )}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
