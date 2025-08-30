"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, getAllCompanies, createUser, updateUser, deleteUser, type User, type SortOrder } from "@/src/lib/usersApi";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useActivityStore } from "@/src/store/activityStore";
import clsx from "clsx";

/**
 * UserTable
 * - Fixed company filter: we fetch companies separately and populate select items.
 * - Fixed pagination edge: disable Next when fetched items < PAGE_SIZE.
 * - Added Loader, Empty State and small responsive tweaks.
 * - Added inline comments to explain logic for reviewers.
 */

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase();
}

const PAGE_SIZE = 5;

export default function UserTable() {
  const qc = useQueryClient();
  const addLog = useActivityStore((s) => s.add);

  // UI state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder | undefined>("asc");
  // companyFilter uses "all" as default string
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  // Query: fetch users for current page/search/sort (JSONPlaceholder returns all users;
  // we still request with _page/_limit for pagination simulation)
  const usersQuery = useQuery({
    queryKey: ["users", { page, search, sortOrder }],
    queryFn: () => getUsers({ page, limit: PAGE_SIZE, search, sortEmail: sortOrder }),
    staleTime: 1000 * 30,
    keepPreviousData: true,
  });

  // Fetch list of companies for the filter dropdown
  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: getAllCompanies,
    staleTime: 1000 * 60,
  });

  // Apply client-side filter by company after data is fetched (some APIs don't support this)
  const filteredUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    if (companyFilter === "all") return list;
    return list.filter((u) => (u.company?.name ?? "").toLowerCase() === companyFilter.toLowerCase());
  }, [usersQuery.data, companyFilter]);

  // Create mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: createUser,
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      // snapshot previous cached data for rollback
      const prev = qc.getQueryData(["users", { page, search, sortOrder }]);
      qc.setQueryData(["users", { page, search, sortOrder }], (old: User[] | undefined) => {
        const company = { name: (payload as any).company };
        const optimistic = { id: Math.floor(Math.random()*100000), name: (payload as any).name, email: (payload as any).email, phone: (payload as any).phone, company } as User;
        return [optimistic, ...(old ?? [])].slice(0, PAGE_SIZE);
      });
      addLog({ type: "add", message: `Added user ${(payload as any).name}` });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      // rollback on error
      if (ctx?.prev) qc.setQueryData(["users", { page, search, sortOrder }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] })
  });

  // Update mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; email: string; phone: string; company: string } }) => updateUser(id, data as any),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData(["users", { page, search, sortOrder }]);
      qc.setQueryData(["users", { page, search, sortOrder }], (old: User[] | undefined) => {
        if (!old) return old;
        return old.map((u) => (u.id === id ? { ...u, ...data, company: { name: data.company } } as any : u));
      });
      addLog({ type: "edit", message: `Edited user #${id}` });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users", { page, search, sortOrder }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] })
  });

  // Delete mutation with optimistic removal
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData(["users", { page, search, sortOrder }]);
      qc.setQueryData(["users", { page, search, sortOrder }], (old: User[] | undefined) => {
        if (!old) return old;
        return old.filter((u) => u.id !== id);
      });
      addLog({ type: "delete", message: `Deleted user #${id}` });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users", { page, search, sortOrder }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] })
  });

  // local UI for dialogs and confirmation
  const [openForm, setOpenForm] = useState<null | { mode: "add" } | { mode: "edit"; user: User }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | User>(null);

  // Helper: determine whether we should allow "Next" page button
  const hasMore = (usersQuery.data ?? []).length >= PAGE_SIZE;

  return (
    <div className="space-y-4">
      {/* Controls: search, sort, filter, add */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex gap-2 items-center w-full md:w-auto flex-wrap">
          <input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            className="w-full md:w-64 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
          />

          {/* Sort Select using Radix */}
          <Select.Root value={sortOrder ?? "asc"} onValueChange={(v) => setSortOrder(v as any)}>
            <Select.Trigger className="rounded-xl border px-3 py-2 border-gray-300 dark:border-gray-700 min-w-[140px] text-left">
              <Select.Value placeholder="Sort by email" />
            </Select.Trigger>
            <Select.Content className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Select.Item value="asc" className="px-3 py-2 cursor-pointer">Email A–Z</Select.Item>
              <Select.Item value="desc" className="px-3 py-2 cursor-pointer">Email Z–A</Select.Item>
            </Select.Content>
          </Select.Root>

          {/* Company Filter - fixed: include 'All' and actual companies */}
          <Select.Root value={companyFilter} onValueChange={(v) => setCompanyFilter(v)}>
            <Select.Trigger className="rounded-xl border px-3 py-2 border-gray-300 dark:border-gray-700 min-w-[160px] text-left">
              <Select.Value placeholder="Filter by company" />
            </Select.Trigger>
            <Select.Content className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 max-h-64 overflow-auto">
              <Select.Item value="all" className="px-3 py-2 cursor-pointer">All companies</Select.Item>
              {(companiesQuery.data ?? []).map((c) => (
                <Select.Item key={c} value={c} className="px-3 py-2 cursor-pointer">{c}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>

        {/* Add User button (opens dialog) */}
        <Dialog.Root open={!!openForm} onOpenChange={(o) => !o && setOpenForm(null)}>
          <Dialog.Trigger asChild>
            <button
              onClick={() => setOpenForm({ mode: "add" })}
              className="rounded-xl bg-indigo-600 text-white px-4 py-2 hover:opacity-90"
            >
              + Add User
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/50" />
            <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
              <Dialog.Title className="text-lg font-semibold">
                {openForm?.mode === "edit" ? "Edit User" : "Add User"}
              </Dialog.Title>
              <UserForm
                initial={openForm?.mode === "edit" ? openForm.user : undefined}
                onSubmit={(values) => {
                  if (openForm?.mode === "edit" && openForm.user) {
                    updateMutation.mutate({ id: openForm.user.id, data: values });
                  } else {
                    createMutation.mutate(values);
                  }
                  setOpenForm(null);
                }}
                onCancel={() => setOpenForm(null)}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Table container */}
      <div className={clsx("rounded-2xl overflow-hidden border", "border-gray-200 dark:border-gray-800")}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th className="text-left p-3">Avatar</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th>
              <th className="text-left p-3">Company</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Loading state: show skeleton rows when fetching initial data */}
            {usersQuery.isLoading && (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3"><div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-48 bg-gray-200 animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-36 bg-gray-200 animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-28 bg-gray-200 animate-pulse" /></td>
                  <td className="p-3"><div className="h-4 w-36 bg-gray-200 animate-pulse" /></td>
                  <td className="p-3"></td>
                </tr>
              ))
            )}

            {/* Render actual rows when data available */}
            {(!usersQuery.isLoading && filteredUsers.length === 0) && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-gray-500">
                  {search ? `No users match "${search}".` : "No users to display."}
                </td>
              </tr>
            )}

            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-white/5">
                <td className="p-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-500 text-white grid place-items-center text-xs font-bold">
                    {initials(u.name)}
                  </div>
                </td>
                <td className="p-3">
                  <Link href={`/users/${u.id}`} className="underline underline-offset-2 decoration-dotted">
                    {u.name}
                  </Link>
                </td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.phone}</td>
                <td className="p-3">{u.company?.name}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      className="px-3 py-1 rounded-lg border border-gray-300 dark:border-gray-700"
                      onClick={() => setOpenForm({ mode: "edit", user: u })}
                    >
                      Edit
                    </button>
                    <AlertDialog.Root open={confirmDelete?.id === u.id} onOpenChange={(o) => !o && setConfirmDelete(null)}>
                      <AlertDialog.Trigger asChild>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          className="px-3 py-1 rounded-lg border border-red-300 text-red-600 dark:border-red-700"
                        >
                          Delete
                        </button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Portal>
                        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
                        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
                          <AlertDialog.Title className="text-lg font-semibold">Delete user?</AlertDialog.Title>
                          <AlertDialog.Description>
                            This will remove the user from the table (optimistic). This API is fake, so changes won't persist after reload.
                          </AlertDialog.Description>
                          <div className="flex justify-end gap-2 pt-2">
                            <AlertDialog.Cancel asChild>
                              <button className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700">Cancel</button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                              <button
                                onClick={() => { deleteMutation.mutate(u.id); setConfirmDelete(null); }}
                                className="px-3 py-2 rounded-lg bg-red-600 text-white"
                              >
                                Delete
                              </button>
                            </AlertDialog.Action>
                          </div>
                        </AlertDialog.Content>
                      </AlertDialog.Portal>
                    </AlertDialog.Root>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Error / info messages */}
        {usersQuery.isError && <div className="p-4 text-sm text-red-500">Failed to load users. Try refreshing.</div>}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
        >
          Prev
        </button>
        <span className="text-sm">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <ActivityPanel />
    </div>
  );
}

function ActivityPanel() {
  const logs = useActivityStore((s) => s.logs);
  const clear = useActivityStore((s) => s.clear);
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h3 className="font-medium">Activity Log (bonus)</h3>
        <button onClick={clear} className="text-sm underline">Clear</button>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {logs.length === 0 && <li className="p-3 text-sm text-gray-500">No activity yet.</li>}
        {logs.map((l) => (
          <li key={l.id} className="p-3 text-sm flex items-center justify-between">
            <span>{l.message}</span>
            <time className="text-xs opacity-70">{new Date(l.at).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}

type FormValues = { name: string; email: string; phone: string; company: string };

function UserForm({ initial, onSubmit, onCancel }: { initial?: User; onSubmit: (v: FormValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<FormValues>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    company: initial?.company?.name ?? "",
  });

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="grid gap-2">
        <label className="text-sm">Name</label>
        <input
          required
          value={values.name}
          onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm">Email</label>
        <input
          type="email"
          required
          value={values.email}
          onChange={(e) => setValues((s) => ({ ...s, email: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm">Phone</label>
        <input
          required
          value={values.phone}
          onChange={(e) => setValues((s) => ({ ...s, phone: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
      </div>
      <div className="grid gap-2">
        <label className="text-sm">Company</label>
        <input
          required
          value={values.company}
          onChange={(e) => setValues((s) => ({ ...s, company: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700">
          Cancel
        </button>
        <button type="submit" className="px-3 py-2 rounded-lg bg-indigo-600 text-white">
          Save
        </button>
      </div>
    </form>
  );
}
