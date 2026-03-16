import { useState, useEffect, type FormEvent } from 'react';
import { getUsers, createUser, updateUser, deactivateUser, type User } from '@/api/users.api.ts';

interface UserFormData {
  email: string;
  name: string;
  password: string;
  roles: ('pcm' | 'admin')[];
  region: string;
}

const emptyForm: UserFormData = { email: '', name: '', password: '', roles: ['pcm'], region: '' };

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  async function loadUsers() {
    try {
      setUsers(await getUsers());
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadUsers(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(user: User) {
    setForm({
      email: user.email,
      name: user.name,
      password: '',
      roles: user.roles,
      region: user.region ?? '',
    });
    setEditingId(user.id);
    setShowForm(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        const updates: Record<string, unknown> = {};
        if (form.name) updates.name = form.name;
        if (form.roles.length) updates.roles = form.roles;
        updates.region = form.region || null;
        if (form.password) updates.password = form.password;
        await updateUser(editingId, updates);
      } else {
        await createUser({
          email: form.email,
          name: form.name,
          password: form.password,
          roles: form.roles,
          region: form.region || undefined,
        });
      }
      setShowForm(false);
      setLoading(true);
      await loadUsers();
    } catch {
      setError(editingId ? 'Failed to update user' : 'Failed to create user');
    }
  }

  async function handleDeactivate() {
    if (!deleteTarget) return;
    try {
      await deactivateUser(deleteTarget.id);
      setDeleteTarget(null);
      setLoading(true);
      await loadUsers();
    } catch {
      setError('Failed to deactivate user');
      setDeleteTarget(null);
    }
  }

  function toggleRole(role: 'pcm' | 'admin') {
    setForm((prev) => {
      const has = prev.roles.includes(role);
      const roles = has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role];
      return { ...prev, roles: roles.length ? roles : prev.roles };
    });
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          Add User
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} autoComplete="off" className="mb-6 rounded-lg border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? 'Edit User' : 'New User'}</h2>

          {!editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                autoComplete="off"
                name="new-user-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password{editingId ? ' (leave blank to keep current)' : ''}
            </label>
            <input
              type="password"
              required={!editingId}
              minLength={8}
              autoComplete="new-password"
              name="new-user-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
            <div className="flex gap-4">
              {(['pcm', 'admin'] as const).map((role) => (
                <label key={role} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.roles.includes(role)}
                    onChange={() => toggleRole(role)}
                    className="rounded border-gray-300"
                  />
                  {role.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Region (optional)</label>
            <input
              type="text"
              placeholder="e.g. APAC, Europe, Americas"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {editingId ? 'Save Changes' : 'Create User'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-sm font-medium text-gray-500">
            <th className="pb-3 pr-4">Name</th>
            <th className="pb-3 pr-4">Email</th>
            <th className="pb-3 pr-4">Roles</th>
            <th className="pb-3 pr-4">Region</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-b border-gray-100 text-sm">
              <td className="py-3 pr-4 font-medium text-gray-900">{user.name}</td>
              <td className="py-3 pr-4 text-gray-600">{user.email}</td>
              <td className="py-3 pr-4">
                <div className="flex gap-1">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                    >
                      {role.toUpperCase()}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3 pr-4 text-gray-600">{user.region ?? '-'}</td>
              <td className="py-3 pr-4">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {user.active ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(user)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                  {user.active && (
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Deactivate User</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to deactivate <span className="font-medium">{deleteTarget.name}</span> ({deleteTarget.email})?
              They will no longer be able to log in.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
              >
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
