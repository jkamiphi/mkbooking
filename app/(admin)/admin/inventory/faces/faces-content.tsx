"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;

export function FacesContent() {
  const [assetId, setAssetId] = useState("");
  const [status, setStatus] = useState<string>("");

  const assetsQuery = trpc.inventory.assets.list.useQuery({ take: 100 });
  const facesQuery = trpc.inventory.faces.list.useQuery({
    assetId: assetId || undefined,
    status: status ? (status as (typeof statusOptions)[number]) : undefined,
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          <select
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All assets</option>
            {assetsQuery.data?.assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.code}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/faces/new">New Face</Link>
        </Button>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Face List
        </h2>
        {facesQuery.isLoading ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Loading faces...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-4">Asset</th>
                  <th className="py-2 pr-4">Face</th>
                  <th className="py-2 pr-4">Position</th>
                  <th className="py-2 pr-4">Size</th>
                  <th className="py-2 pr-4">Facing</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {facesQuery.data?.faces.map((face) => (
                  <tr
                    key={face.id}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="py-2 pr-4 font-medium text-neutral-900 dark:text-white">
                      {face.asset.code}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.code}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.position?.name ?? "-"}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {String(face.width)} x {String(face.height)}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.facing}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.status}
                    </td>
                  </tr>
                ))}
                {!facesQuery.data?.faces.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      No faces found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
