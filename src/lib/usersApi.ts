// src/lib/usersApi.ts

import { ReactNode } from "react";
import { api } from "./api";

export interface Address {
  suite: ReactNode;
  street: string;
  city: string;
  zipcode: string;
}

export interface Company {
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: Company;
  address: Address;
}

export type SortOrder = "asc" | "desc";

// New type for getUsers parameters, including 'company'.
export type GetUsersParams = {
  page: number;
  limit: number;
  search?: string;
  sortEmail?: SortOrder;
  company?: string;
};

// Fetch users with pagination, search, sorting, and company filtering.
export async function getUsers(params: GetUsersParams) {
  const { page, limit, search, sortEmail, company } = params;
  
  // Construct the query parameters for the API call
  const apiParams: { [key: string]: any } = {
    _page: page,
    _limit: limit,
    _sort: sortEmail ? "email" : undefined,
    _order: sortEmail,
  };

  if (search) {
    apiParams.q = search; // Use the 'q' parameter for server-side search
  }
  
  if (company) {
    // Add company filter to the API request
    apiParams['company.name'] = company;
  }
  
  const res = await api.get<User[]>("/users", {
    params: apiParams,
  });
  
  // Return data directly, as filtering is now done on the server
  return res.data;
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