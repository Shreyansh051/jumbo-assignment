// components/UserTable.tsx

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, getAllCompanies, createUser, updateUser, deleteUser, type User, type SortOrder } from "@/lib/usersApi";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import Link from "next/link";
import { useActivityStore } from "@/store/activityStore";
import clsx from "clsx";
import { TailSpin } from 'react-loader-spinner';
import { Search, ListFilter, Plus, Pencil, EyeIcon, Trash } from "lucide-react";

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const PAGE_SIZE = 5;

export default function UserTable() {
  const qc = useQueryClient();
  const addLog = useActivityStore((s) => s.add);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder | undefined>("asc");
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const usersQuery = useQuery({
    queryKey: ["users", { page, search, sortOrder, companyFilter }],
    queryFn: () => getUsers({ page, limit: PAGE_SIZE, search, sortEmail: sortOrder, company: companyFilter === 'all' ? undefined : companyFilter }),
    staleTime: 1000 * 30,
    placeholderData: (previousData) => previousData,
  });

  const companiesQuery = useQuery({
    queryKey: ["companies"],
    queryFn: getAllCompanies,
    staleTime: 1000 * 60,
  });

  const filteredUsers = usersQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: createUser,
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData(["users", { page, search, sortOrder, companyFilter }]);
      qc.setQueryData(["users", { page, search, sortOrder, companyFilter }], (old: User[] | undefined) => {
        const company = { name: (payload as any).company };
        const optimistic = { id: Math.floor(Math.random() * 100000), name: (payload as any).name, email: (payload as any).email, phone: (payload as any).phone, company } as User;
        return [optimistic, ...(old ?? [])].slice(0, PAGE_SIZE);
      });
      addLog({ type: "add", message: `Added user ${(payload as any).name}` });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users", { page, search, sortOrder, companyFilter }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; email: string; phone: string; company: string } }) => updateUser(id, data as any),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData(["users", { page, search, sortOrder, companyFilter }]);
      qc.setQueryData(["users", { page, search, sortOrder, companyFilter }], (old: User[] | undefined) => {
        if (!old) return old;
        return old.map((u) => (u.id === id ? { ...u, ...data, company: { name: data.company } } as any : u));
      });
      addLog({ type: "edit", message: `Edited user ${data.name}` });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users", { page, search, sortOrder, companyFilter }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onMutate: async (id: number) => {
      await qc.cancelQueries({ queryKey: ["users"] });
      const prev = qc.getQueryData(["users", { page, search, sortOrder, companyFilter }]);
      const deletedUser = (prev as User[]).find(u => u.id === id);
      qc.setQueryData(["users", { page, search, sortOrder, companyFilter }], (old: User[] | undefined) => {
        if (!old) return old;
        return old.filter((u) => u.id !== id);
      });
      addLog({ type: "delete", message: `Deleted user ${deletedUser?.name ?? 'Unknown'}` });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["users", { page, search, sortOrder, companyFilter }], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["users"] })
  });

  const [openForm, setOpenForm] = useState<null | { mode: "add" } | { mode: "edit"; user: User }>(null);
  const [confirmDelete, setConfirmDelete] = useState<null | User>(null);

  const hasMore = (usersQuery.data ?? []).length >= PAGE_SIZE;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full md:w-auto">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              placeholder="Search"
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <Select.Root value={sortOrder ?? "asc"} onValueChange={(v) => setSortOrder(v as any)}>
            <Select.Trigger className="rounded-xl border px-3 py-2 border-gray-300 dark:border-gray-700 min-w-[140px] min-h-[39px] text-left data-[state=open]:border-b-0 data-[state=open]:rounded-b-none text-sm">
              <div className="flex items-center gap-2">
                <ListFilter size={16} /> <span>Sort</span>
              </div>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={-1}
                className="z-50 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 w-[var(--radix-select-trigger-width)] rounded-b-xl"
              >
                <Select.Item value="asc" className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none text-sm">Email A–Z</Select.Item>
                <Select.Item value="desc" className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none text-sm">Email Z–A</Select.Item>
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <Select.Root value={companyFilter} onValueChange={(v) => { setPage(1); setCompanyFilter(v); }}>
            <Select.Trigger className="rounded-xl border px-3 py-2 border-gray-300 dark:border-gray-700 min-w-[160px] min-h-[39px] text-left data-[state=open]:border-b-0 data-[state=open]:rounded-b-none text-sm">
              <div className="flex items-center gap-2">
                <ListFilter size={16} /> <Select.Value className="text-gray-500 dark:text-gray-400">{companyFilter === "all" ? "Filter" : companyFilter}</Select.Value>
              </div>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                position="popper"
                sideOffset={-1}
                className="z-50 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 w-[var(--radix-select-trigger-width)] max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] rounded-b-xl"
              >
                <Select.Item value="all" className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none text-sm">All companies</Select.Item>
                {(companiesQuery.data ?? []).map((c) => (
                  <Select.Item key={c} value={c} className="px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none text-sm">{c}</Select.Item>
                ))}
              </Select.Content>
            </Select.Portal>
          </Select.Root>
        </div>
        <Dialog.Root open={!!openForm} onOpenChange={(o) => !o && setOpenForm(null)}>
          <Dialog.Trigger asChild>
            <button
              onClick={() => setOpenForm({ mode: "add" })}
              className="rounded-xl bg-[#8009CB] text-white px-4 py-2 hover:opacity-90 w-full md:w-auto flex items-center justify-center gap-2"
            >
              <Plus size={20} /> <span className="text-sm">Add User</span>
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
                isSubmitting={createMutation.isPending || updateMutation.isPending}
              />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <div className={clsx("rounded-2xl overflow-hidden border overflow-x-auto", "border-gray-200 dark:border-gray-800")}>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60">
            <tr className="whitespace-nowrap">
              <th className="text-left p-3 text-xs sm:text-sm">Avatar</th>
              <th className="text-left p-3 text-xs sm:text-sm">Name</th>
              <th className="text-left p-3 text-xs sm:text-sm">Email</th>
              <th className="text-left p-3 text-xs sm:text-sm">Phone</th>
              <th className="text-left p-3 text-xs sm:text-sm">Company</th>
              <th className="text-left p-3 text-xs sm:text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isFetching && (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-800 animate-pulse">
                  <td className="p-3"><div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" /></td>
                  <td className="p-3"><div className="h-4 w-48 bg-gray-200 dark:bg-gray-700" /></td>
                  <td className="p-3"><div className="h-4 w-36 bg-gray-200 dark:bg-gray-700" /></td>
                  <td className="p-3"><div className="h-4 w-28 bg-gray-200 dark:bg-gray-700" /></td>
                  <td className="p-3"><div className="h-4 w-36 bg-gray-200 dark:bg-gray-700" /></td>
                  <td className="p-3"></td>
                </tr>
              ))
            )}
            {!usersQuery.isFetching && filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-sm text-gray-500">
                  {search || companyFilter !== 'all' ? `No users found matching your criteria.` : "No users to display."}
                </td>
              </tr>
            )}
            {!usersQuery.isFetching && filteredUsers.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-white/5 whitespace-nowrap">
                <td className="p-3">
                  <div className="h-8 w-8 rounded-full bg-[#8009CB] text-white grid place-items-center text-xs font-bold">
                    {initials(u.name)}
                  </div>
                </td>
                <td className="p-3">
                  <Link href={`/users/${u.id}`} className="underline underline-offset-2 decoration-dotted text-xs sm:text-sm">
                    {u.name}
                  </Link>
                </td>
                <td className="p-3 text-xs sm:text-sm">{u.email}</td>
                <td className="p-3 text-xs sm:text-sm">{u.phone}</td>
                <td className="p-3 text-xs sm:text-sm">{u.company?.name}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      className="p-2 rounded-lg border border-gray-300 text-blue-600 dark:border-blue-700 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-gray-800"
                    >
                        <Link href={`/users/${u.id}`} >
                      <EyeIcon size={16} /> 
                    </Link>
                      
                    </button>
                      <button
                      className="p-2 rounded-lg border border-teal-300 text-teal-600 dark:border-teal-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => setOpenForm({ mode: "edit", user: u })}
                    >
                      <Pencil size={16} />
                    </button>
                    <AlertDialog.Root open={confirmDelete?.id === u.id} onOpenChange={(o) => !o && setConfirmDelete(null)}>
                      <AlertDialog.Trigger asChild>
                        <button
                          onClick={() => setConfirmDelete(u)}
                          className="p-2 rounded-lg border border-red-300 text-red-600 dark:border-red-700 hover:bg-red-50/60 dark:hover:bg-red-900/40"
                        >
                          <Trash size={16} />
                        </button>
                      </AlertDialog.Trigger>
                      <AlertDialog.Portal>
                        <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
                        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-2xl p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
                          <AlertDialog.Title className="text-lg font-semibold">Delete user?</AlertDialog.Title>
                          <AlertDialog.Description className="text-sm">
                            Are you sure you want to delete {u.name}? This action cannot be undone.
                          </AlertDialog.Description>
                          <div className="flex justify-end gap-2 pt-2">
                            <AlertDialog.Cancel asChild>
                              <button className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm">Cancel</button>
                            </AlertDialog.Cancel>
                            <AlertDialog.Action asChild>
                              <button
                                onClick={() => { deleteMutation.mutate(u.id); setConfirmDelete(null); }}
                                className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm"
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
        {usersQuery.isError && <div className="p-4 text-sm text-red-500">Failed to load users. Try refreshing.</div>}
      </div>
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-sm"
        >
          Prev
        </button>
        <span className="text-sm">Page {page}</span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 disabled:opacity-50 text-sm"
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
        <h3 className="font-medium text-sm sm:text-base">Activity Log</h3>
        <button onClick={clear} className="text-xs sm:text-sm underline">Clear</button>
      </div>
      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {logs.length === 0 && <li className="p-3 text-xs sm:text-sm text-gray-500">No activity yet.</li>}
        {logs.map((l) => (
          <li key={l.id} className="p-3 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <span className="mb-1 sm:mb-0">{l.message}</span>
            <time className="text-xs opacity-70 whitespace-nowrap">{new Date(l.at).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </div>
  );
}

type FormValues = { name: string; email: string; phone: string; company: string };

function UserForm({ initial, onSubmit, onCancel, isSubmitting }: { initial?: User; onSubmit: (v: FormValues) => void; onCancel: () => void; isSubmitting: boolean }) {
  const [values, setValues] = useState<FormValues>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    company: initial?.company?.name ?? "",
  });

  const [errors, setErrors] = useState<Partial<FormValues>>({});

  const validate = () => {
    const newErrors: Partial<FormValues> = {};
    if (!values.name.trim()) newErrors.name = "Name is required.";
    if (!values.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      newErrors.email = "Email is not valid.";
    }
    if (!values.phone.trim()) newErrors.phone = "Phone is required.";
    if (!values.company.trim()) newErrors.company = "Company is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (validate()) {
          onSubmit(values);
        }
      }}
    >
      <div className="grid gap-2">
        <label className="text-sm">Name</label>
        <input
          placeholder="e.g. Jane Doe"
          value={values.name}
          onChange={(e) => setValues((s) => ({ ...s, name: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div className="grid gap-2">
        <label className="text-sm">Email</label>
        <input
          type="email"
          placeholder="e.g. jane@example.com"
          value={values.email}
          onChange={(e) => setValues((s) => ({ ...s, email: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>
      <div className="grid gap-2">
        <label className="text-sm">Phone</label>
        <input
          placeholder="e.g. 555-123-4567"
          value={values.phone}
          onChange={(e) => setValues((s) => ({ ...s, phone: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
      </div>
      <div className="grid gap-2">
        <label className="text-sm">Company</label>
        <input
          placeholder="e.g. Acme Corp"
          value={values.company}
          onChange={(e) => setValues((s) => ({ ...s, company: e.target.value }))}
          className="rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm"
        />
        {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm">
          Cancel
        </button>
        <button type="submit" className="px-3 py-2 rounded-lg bg-[#8009CB] text-white flex items-center justify-center text-sm" disabled={isSubmitting}>
          {isSubmitting ? (
            <TailSpin color="#FFF" height={20} width={20} />
          ) : (
            "Save"
          )}
        </button>
      </div>
    </form>
  );
}