import { api } from "./api";

export interface Address { street: string; city: string; zipcode: string; }
export interface Company { name: string; }
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: Company;
  address: Address;
}

export type SortOrder = "asc" | "desc";

// Fetch users with simple pagination simulation.
// JSONPlaceholder doesn't fully support server-side search by name, so we filter client-side.
export async function getUsers(params: {
  page: number;
  limit: number;
  search?: string;
  sortEmail?: SortOrder;
}) {
  const { page, limit, search, sortEmail } = params;
  const res = await api.get<User[]>("/users", {
    params: {
      _page: page,
      _limit: limit,
      _sort: sortEmail ? "email" : undefined,
      _order: sortEmail,
    },
  });
  let data = res.data;
  // Client-side search by name
  if (search) {
    const q = search.toLowerCase();
    data = data.filter((u) => u.name.toLowerCase().includes(q));
  }
  return data;
}

// Get unique company names for Select
export async function getAllCompanies(): Promise<string[]> {
  const res = await api.get<User[]>("/users");
  const set = new Set(res.data.map((u) => (u.company?.name ?? "").trim()).filter(Boolean));
  return Array.from(set);
}

export async function getUserById(id: number): Promise<User> {
  const res = await api.get<User>(`/users/${id}`);
  return res.data;
}

// Create user (JSONPlaceholder will not persist, so we fake id & company shape)
export async function createUser(data: Omit<User, "id" | "address" | "company"> & { company: string }) {
  await api.post("/users", data);
  return { ...data, id: Math.floor(Math.random() * 10000), company: { name: data.company } } as any;
}

export async function updateUser(id: number, data: Partial<User> & { company?: string }) {
  await api.put(`/users/${id}`, data);
  return {
    id,
    ...data,
    ...(data.company ? { company: { name: data.company } } : {}),
  } as Partial<User>;
}

export async function deleteUser(id: number) {
  await api.delete(`/users/${id}`);
  return true;
}
