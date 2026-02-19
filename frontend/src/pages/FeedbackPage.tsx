import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Plus, Send, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';

interface Feedback {
  id: string;
  type: 'plainte' | 'suggestion' | 'bug' | 'autre';
  subject: string;
  message: string;
  status: 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
  adminReply: string | null;
  repliedAt: string | null;
  createdAt: string;
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
const statusIcons: Record<string, typeof Clock> = {
  ouvert: AlertCircle,
  en_cours: Clock,
  resolu: CheckCircle,
  ferme: XCircle,
};

export function FeedbackPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ type: 'plainte', subject: '', message: '' });
  const [detailOpen, setDetailOpen] = useState<Feedback | null>(null);

  const serverUrl = localStorage.getItem('sync_server_url') || window.location.origin;

  const fetchFeedbacks = () => {
    fetch(`${serverUrl}/api/feedbacks`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setFeedbacks)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFeedbacks(); }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${serverUrl}/api/feedbacks`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Votre retour a été envoyé');
      setModalOpen(false);
      setForm({ type: 'plainte', subject: '', message: '' });
      fetchFeedbacks();
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-text-muted hover:text-text transition-colors" title="Retour">
            <ArrowLeft size={20} />
          </button>
          <MessageSquare size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Mes retours</h1>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} className="mr-1" /> Nouveau retour
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-text-muted mb-3 opacity-40" />
            <p className="text-text-muted mb-4">Vous n'avez envoyé aucun retour pour le moment.</p>
            <Button onClick={() => setModalOpen(true)}>
              <Plus size={16} className="mr-1" /> Envoyer un retour
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedbacks.map((fb) => {
            const StatusIcon = statusIcons[fb.status];
            return (
              <Card
                key={fb.id}
                className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.005]"
                onClick={() => setDetailOpen(fb)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{typeIcons[fb.type]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-text truncate">{fb.subject}</h3>
                      <Badge variant={statusVariants[fb.status]} className="text-xs">
                        <StatusIcon size={12} className="mr-1" />
                        {statusLabels[fb.status]}
                      </Badge>
                      <Badge variant="default" className="text-xs">{typeLabels[fb.type]}</Badge>
                    </div>
                    <p className="text-sm text-text-muted line-clamp-2">{fb.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span>Envoyé le {formatDate(fb.createdAt)}</span>
                      {fb.adminReply && (
                        <span className="text-success font-medium">Réponse reçue</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* New feedback modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau retour">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="plainte">Plainte</option>
              <option value="suggestion">Suggestion</option>
              <option value="bug">Bug / Problème technique</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <Input
            id="fbSubject"
            label="Sujet"
            value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder="Résumez votre retour en quelques mots"
            required
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">Message</label>
            <textarea
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
              placeholder="Décrivez votre retour en détail..."
              rows={5}
              required
              className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={submitting}>
              <Send size={14} className="mr-1" />
              {submitting ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!detailOpen} onClose={() => setDetailOpen(null)} title={detailOpen?.subject || ''}>
        {detailOpen && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={statusVariants[detailOpen.status]}>{statusLabels[detailOpen.status]}</Badge>
              <Badge variant="default">{typeLabels[detailOpen.type]}</Badge>
              <span className="text-xs text-text-muted">{formatDate(detailOpen.createdAt)}</span>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm font-medium text-text-muted mb-1">Votre message</p>
              <p className="text-sm text-text whitespace-pre-wrap">{detailOpen.message}</p>
            </div>

            {detailOpen.adminReply ? (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm font-medium text-primary mb-1">Réponse de l'administrateur</p>
                <p className="text-sm text-text whitespace-pre-wrap">{detailOpen.adminReply}</p>
                {detailOpen.repliedAt && (
                  <p className="text-xs text-text-muted mt-2">Répondu le {formatDate(detailOpen.repliedAt)}</p>
                )}
              </div>
            ) : (
              <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                <p className="text-sm text-warning">En attente de réponse de l'administrateur</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
