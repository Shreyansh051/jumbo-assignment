"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserById } from "@/lib/usersApi";
import { useParams, useRouter } from "next/navigation";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["user", id],
    queryFn: () => getUserById(id),
  });

  if (isLoading) return <p>Loading user...</p>;
  if (isError || !user) return <p>Failed to load user.</p>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="underline text-sm">← Back</button>
      <h1 className="text-2xl font-semibold">{user.name}</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl p-4 bg-card-light dark:bg-card-dark">
          <h2 className="font-medium mb-2">Contact</h2>
          <p><span className="font-medium">Email:</span> {user.email}</p>
          <p><span className="font-medium">Phone:</span> {user.phone}</p>
          <p><span className="font-medium">Company:</span> {user.company?.name}</p>
        </div>
        <div className="rounded-2xl p-4 bg-card-light dark:bg-card-dark">
          <h2 className="font-medium mb-2">Address</h2>
          <p>{user.address?.street}</p>
          <p>{user.address?.city} - {user.address?.zipcode}</p>
        </div>
      </div>
    </div>
  );
}
