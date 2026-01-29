"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function FacePositionsPage() {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const positionsQuery = trpc.inventory.facePositions.list.useQuery();
  const createPosition = trpc.inventory.facePositions.create.useMutation({
    onSuccess: () => {
      utils.inventory.facePositions.list.invalidate();
      setName("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Face Positions
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage face positions (A/B, Norte/Sur, etc.).
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createPosition.mutate({ name: name.trim() });
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Position name"
            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <Button type="submit" disabled={!name.trim() || createPosition.isPending}>
            {createPosition.isPending ? "Saving..." : "Add Position"}
          </Button>
        </form>

        <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-2">
          {positionsQuery.data?.map((position) => (
            <li key={position.id}>{position.name}</li>
          ))}
          {!positionsQuery.data?.length && (
            <li className="text-neutral-500 dark:text-neutral-400">
              No positions yet.
            </li>
          )}
        </ul>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/inventory/taxonomy">Back to taxonomy</Link>
      </Button>
    </div>
  );
}
