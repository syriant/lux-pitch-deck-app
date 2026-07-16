import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDecks, createDeck, deleteDeck, type Deck } from '@/api/decks.api';
import { getTemplates, type DeckTemplate } from '@/api/templates.api';
import { getUsers, type User } from '@/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { SUPPORTED_LOCALES } from '@/components/preview/i18n';

const localeLabel = (code: string): string =>
  SUPPORTED_LOCALES.find((l) => l.code === code)?.label ?? code;

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [ownerOptions, setOwnerOptions] = useState<User[]>([]);

  const isAdmin = user?.roles?.includes('admin') ?? false;
  const hasActiveFilters = !!(search || statusFilter || ownerFilter);

  async function load() {
    try {
      const res = await getDecks({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        createdBy: ownerFilter || undefined,
      });
      setDecks(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      setError('Failed to load decks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [page, search, statusFilter, ownerFilter]);

  // Owner filter options — admins only (the users endpoint is admin-only too).
  useEffect(() => {
    if (!isAdmin) return;
    getUsers().then(setOwnerOptions).catch(() => {});
  }, [isAdmin]);

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

  const [deleteTarget, setDeleteTarget] = useState<Deck | null>(null);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteDeck(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch {
      setError('Failed to delete deck');
      setDeleteTarget(null);
    }
  }

  function formatDate(iso: string): string {
    // Parse date parts directly to avoid timezone shifting
    // (server stores local time in timestamp without timezone)
    const d = new Date(iso.replace('Z', '').replace(/\+.*$/, ''));
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  return (
    <div className="p-8">
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

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by deck or hotel name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="exported">Exported</option>
        </select>
        {isAdmin && (
          <select
            value={ownerFilter}
            onChange={(e) => { setOwnerFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[#01B18B] focus:outline-none focus:ring-1 focus:ring-[#01B18B]"
          >
            <option value="">All users</option>
            {ownerOptions.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}
      </div>

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
          {hasActiveFilters ? (
            <>
              <p className="text-[#7E8188]">No decks match your search.</p>
              <p className="mt-1 text-sm text-gray-400">Try a different search term or clear the filters.</p>
            </>
          ) : (
            <>
              <p className="text-[#7E8188]">No decks yet.</p>
              <p className="mt-1 text-sm text-gray-400">Create your first pitch deck to get started.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <h2 className="text-sm font-medium text-[#7E8188] mb-3">
            {hasActiveFilters ? `${total} deck${total === 1 ? '' : 's'} found` : 'Recent Decks'}
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-medium text-[#7E8188]">
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 pr-4">Template</th>
                <th className="pb-3 pr-4">Created By</th>
                <th className="pb-3 pr-4">Created</th>
                <th className="pb-3 pr-4">Updated</th>
                <th className="pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {decks.map((deck) => {
                const isDeleted = !!deck.deletedAt;
                return (
                  <tr
                    key={deck.id}
                    className={`border-b border-gray-100 text-sm ${isDeleted ? 'opacity-50' : 'hover:bg-gray-50 cursor-pointer'}`}
                    onClick={() => !isDeleted && navigate(`/decks/${deck.id}/edit`)}
                  >
                    <td className="py-3 pr-4 font-medium text-[#363A45]">
                      {deck.name}
                      {deck.translatedLocales?.map((code) => (
                        <span
                          key={code}
                          title={`Translated to ${localeLabel(code)}`}
                          className="ml-1.5 inline-block rounded bg-[#E6F9F5] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#01B18B] align-middle"
                        >
                          {code}
                        </span>
                      ))}
                      {isDeleted && (
                        <span className="ml-2 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                          Deleted
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[deck.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {deck.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{deck.templateName ?? '-'}</td>
                    <td className="py-3 pr-4 text-gray-600">{deck.createdByName ?? '-'}</td>
                    <td className="py-3 pr-4 text-[#7E8188]">{formatDate(deck.createdAt)}</td>
                    <td className="py-3 pr-4 text-[#7E8188]">{formatDate(deck.updatedAt)}</td>
                    <td className="py-3 flex items-center gap-2">
                      {!isDeleted && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/decks/${deck.id}/edit`); }}
                          className="text-xs text-[#01B18B] hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {!isDeleted && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/decks/${deck.id}/preview`); }}
                          className="text-xs text-[#01B18B] hover:underline"
                        >
                          Preview
                        </button>
                      )}
                      {!isDeleted && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(deck); }}
                          className="text-red-400 hover:text-red-600"
                          title="Delete deck"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="mt-4 flex gap-2 justify-center">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Prev</button>
              <span className="px-3 py-1 text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50">Next</button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete deck"
        message={deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"?${isAdmin ? ' It will be hidden from PCMs but still visible to admins.' : ''}` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
