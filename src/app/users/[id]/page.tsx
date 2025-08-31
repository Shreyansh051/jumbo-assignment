"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserById, type User } from "@/lib/usersApi";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["user", id],
    queryFn: () => getUserById(id),
  });

  if (isLoading) {
    return (
      <div className="py-20 px-4 max-w-3xl mx-auto space-y-4">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse h-40" />
          <div className="p-5 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse h-40" />
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return <p className="text-center py-20 text-red-500">Failed to load user.</p>;
  }

  return (
    <div className="space-y-6 px-4 md:px-0 max-w-3xl mx-auto">
      <button 
        onClick={() => router.back()} 
        className="flex items-center text-sm text-[#8009CB] font-medium hover:underline"
      >
        ← Back
      </button>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-[#8009CB] grid place-items-center text-white text-lg font-bold">
          {user.name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
        </div>
        <h1 className="text-2xl font-semibold">{user.name}</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contact Card */}
        <div className={clsx(
          "rounded-2xl p-5 shadow-sm dark:shadow-none",
          "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
          "transition hover:shadow-md"
        )}>
          <h2 className="font-semibold text-lg mb-3 border-b pb-1 border-gray-200 dark:border-gray-700">Contact Info</h2>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p><span className="font-medium">Email:</span> {user.email}</p>
            <p><span className="font-medium">Phone:</span> {user.phone}</p>
            <p><span className="font-medium">Company:</span> {user.company?.name}</p>
          </div>
        </div>

        {/* Address Card */}
        <div className={clsx(
          "rounded-2xl p-5 shadow-sm dark:shadow-none",
          "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800",
          "transition hover:shadow-md"
        )}>
          <h2 className="font-semibold text-lg mb-3 border-b pb-1 border-gray-200 dark:border-gray-700">Address</h2>
          <div className="space-y-1 text-gray-700 dark:text-gray-300">
            <p>{user.address?.street}</p>
            {user.address?.suite && <p>{user.address.suite}</p>}
            <p>{user.address?.city} - {user.address?.zipcode}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
