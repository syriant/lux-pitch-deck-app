import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDecks, createDeck, type Deck } from '@/api/decks.api';
import { getTemplates, type DeckTemplate } from '@/api/templates.api';
import { useAuthStore } from '@/stores/auth.store';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ready: 'bg-[#E6F9F5] text-[#01B18B]',
  exported: 'bg-green-100 text-green-700',
};

export function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [templates, setTemplates] = useState<DeckTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  async function load() {
    try {
      const res = await getDecks({ limit: 20 });
      setDecks(res.data);
    } catch {
      setError('Failed to load decks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleShowCreate() {
    setShowCreate(true);
    setLoadingTemplates(true);
    try {
      const t = await getTemplates();
      setTemplates(t);
      if (t.length > 0) {
        setSelectedTemplateId(t[0].id);
      }
    } catch {
      // Templates are optional — proceed without them
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const deck = await createDeck({
        name,
        templateId: selectedTemplateId ?? undefined,
      });
      setShowCreate(false);
      setName('');
      setSelectedTemplateId(null);
      navigate(`/decks/${deck.id}/edit`);
      return;
    } catch {
      setError('Failed to create deck');
    } finally {
      setCreating(false);
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#363A45]">Dashboard</h1>
          <p className="mt-1 text-sm text-[#7E8188]">
            Welcome back{user?.name ? `, ${user.name}` : ''}
          </p>
        </div>
        <button
          onClick={handleShowCreate}
          className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977]"
        >
          Create New Deck
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[#363A45]">New Deck</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Deck Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grand Hyatt Bali — March 2026"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
            />
          </div>

          {/* Template picker */}
          {loadingTemplates ? (
            <div className="text-sm text-gray-400">Loading templates...</div>
          ) : templates.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedTemplateId === t.id
                        ? 'border-[#01B18B] bg-[#E6F9F5]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-[#363A45]">{t.name}</div>
                    {t.description && (
                      <div className="mt-1 text-xs text-[#7E8188]">{t.description}</div>
                    )}
                    <div className="mt-1 text-xs text-gray-400">{t.slides.length} slides</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-[#01B18B] px-4 py-2 text-sm text-white hover:bg-[#009977] disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setName(''); setSelectedTemplateId(null); }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-[#7E8188]">Loading...</div>
      ) : decks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-[#7E8188]">No decks yet.</p>
          <p className="mt-1 text-sm text-gray-400">Create your first pitch deck to get started.</p>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-medium text-[#7E8188] mb-3">Recent Decks</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-[#7E8188]">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Created By</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3 pr-4">Updated</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => (
                <tr key={deck.id} className="border-b border-gray-100 text-sm hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/decks/${deck.id}/edit`)}>
                  <td className="py-3 pr-4 font-medium text-[#363A45]">{deck.name}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[deck.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {deck.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{deck.createdByName ?? '-'}</td>
                  <td className="py-3 pr-4 text-[#7E8188]">{formatDate(deck.createdAt)}</td>
                  <td className="py-3 pr-4 text-[#7E8188]">{formatDate(deck.updatedAt)}</td>
                  <td className="py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/decks/${deck.id}/preview`); }}
                      className="text-xs text-[#01B18B] hover:underline"
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
