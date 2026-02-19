import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { MessageSquare, Send, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';

interface FeedbackRow {
  id: string;
  userId: string;
  userName: string;
  type: 'plainte' | 'suggestion' | 'bug' | 'autre';
  subject: string;
  message: string;
  status: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
  tenant: { name: string; slug: string } | null;
}

const typeLabels: Record<string, string> = {
  plainte: 'Plainte',
  suggestion: 'Suggestion',
  bug: 'Bug',
  autre: 'Autre',
};
const typeIcons: Record<string, string> = {
  plainte: '😤',
  suggestion: '💡',
  bug: '🐛',
  autre: '📝',
};
const statusLabels: Record<string, string> = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  resolu: 'Résolu',
  ferme: 'Fermé',
};
const statusVariants: Record<string, 'warning' | 'info' | 'success' | 'default'> = {
  ouvert: 'warning',
  en_cours: 'info',
  resolu: 'success',
  ferme: 'default',
};

export function AdminFeedback() {
  const token = useAuthStore((s) => s.token);
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<FeedbackRow | null>(null);
  const [reply, setReply] = useState('');
  const [replyStatus, setReplyStatus] = useState('resolu');
  const [submitting, setSubmitting] = useState(false);

  const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;

  const fetchFeedbacks = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (typeFilter !== 'all') params.set('type', typeFilter);

    fetch(`${serverUrl}/api/admin/feedbacks?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setFeedbacks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, statusFilter, typeFilter, serverUrl]);

  useEffect(() => { fetchFeedbacks(); }, [fetchFeedbacks]);

  const openReply = (fb: FeedbackRow) => {
    setSelected(fb);
    setReply(fb.adminReply || '');
    setReplyStatus(fb.status === 'ouvert' || fb.status === 'en_cours' ? 'resolu' : fb.status);
  };

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${serverUrl}/api/admin/feedbacks/${selected.id}/reply`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: reply.trim(), status: replyStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Réponse envoyée');
      setSelected(null);
      fetchFeedbacks();
    } catch {
      toast.error('Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${serverUrl}/api/admin/feedbacks/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast.success('Statut mis à jour');
      fetchFeedbacks();
    } catch {
      toast.error('Erreur');
    }
  };

  const counts = {
    total: feedbacks.length,
    ouvert: feedbacks.filter((f) => f.status === 'ouvert').length,
    en_cours: feedbacks.filter((f) => f.status === 'en_cours').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare size={24} className="text-primary" />
        <h1 className="text-2xl font-bold text-text">Retours utilisateurs</h1>
        {counts.ouvert > 0 && (
          <span className="px-2.5 py-0.5 bg-warning/10 text-warning text-xs font-bold rounded-full">
            {counts.ouvert} nouveau(x)
          </span>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 flex-wrap flex-1">
            {['all', 'ouvert', 'en_cours', 'resolu', 'ferme'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? 'Tous' : statusLabels[s]}
              </button>
            ))}
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg bg-surface text-text text-sm"
          >
            <option value="all">Tous les types</option>
            <option value="plainte">Plaintes</option>
            <option value="suggestion">Suggestions</option>
            <option value="bug">Bugs</option>
            <option value="autre">Autres</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <p className="text-center text-text-muted py-12">Aucun retour trouvé</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => (
            <Card key={fb.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{typeIcons[fb.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-text">{fb.subject}</h3>
                    <Badge variant={statusVariants[fb.status]} className="text-xs">
                      {statusLabels[fb.status]}
                    </Badge>
                    <Badge variant="default" className="text-xs">{typeLabels[fb.type]}</Badge>
                  </div>
                  <p className="text-sm text-text-muted line-clamp-2 mb-2">{fb.message}</p>
                  <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
                    <span className="font-medium text-text">{fb.userName}</span>
                    {fb.tenant && (
                      <span className="flex items-center gap-1">
                        <Store size={12} /> {fb.tenant.name}
                      </span>
                    )}
                    <span>{formatDate(fb.createdAt)}</span>
                    {fb.adminReply && <span className="text-success">Répondu</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button size="sm" variant="primary" onClick={() => openReply(fb)}>
                    <Send size={14} className="mr-1" /> Répondre
                  </Button>
                  {fb.status === 'ouvert' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(fb.id, 'en_cours')}>
                      Prendre en charge
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reply modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Répondre au retour">
        {selected && (
          <form onSubmit={handleReply} className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{typeIcons[selected.type]}</span>
                <span className="font-semibold text-text">{selected.subject}</span>
              </div>
              <p className="text-sm text-text whitespace-pre-wrap mb-2">{selected.message}</p>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>{selected.userName}</span>
                {selected.tenant && <span>{selected.tenant.name}</span>}
                <span>{formatDate(selected.createdAt)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Votre réponse</label>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Tapez votre réponse..."
                rows={4}
                required
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">Statut après réponse</label>
              <select
                value={replyStatus}
                onChange={(e) => setReplyStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text text-sm"
              >
                <option value="en_cours">En cours</option>
                <option value="resolu">Résolu</option>
                <option value="ferme">Fermé</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={() => setSelected(null)}>Annuler</Button>
              <Button type="submit" disabled={submitting}>
                <Send size={14} className="mr-1" />
                {submitting ? 'Envoi...' : 'Envoyer la réponse'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
