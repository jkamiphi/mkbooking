"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;

export function AssetsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [structureTypeId, setStructureTypeId] = useState("");
  const [zoneId, setZoneId] = useState("");

  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();

  const assetsQuery = trpc.inventory.assets.list.useQuery({
    search: search.trim() || undefined,
    status: status ? (status as (typeof statusOptions)[number]) : undefined,
    structureTypeId: structureTypeId || undefined,
    zoneId: zoneId || undefined,
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code or address"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
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
          <select
            value={structureTypeId}
            onChange={(event) => setStructureTypeId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All structure types</option>
            {structureTypesQuery.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <select
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All zones</option>
            {zonesQuery.data?.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.province.name} - {zone.name}
              </option>
            ))}
          </select>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/assets/new">New Asset</Link>
        </Button>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Asset List
        </h2>
        {assetsQuery.isLoading ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Loading assets...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Structure</th>
                  <th className="py-2 pr-4">Zone</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Digital</th>
                  <th className="py-2 pr-4">Lit</th>
                  <th className="py-2 pr-4">Faces</th>
                </tr>
              </thead>
              <tbody>
                {assetsQuery.data?.assets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="py-2 pr-4 font-medium text-neutral-900 dark:text-white">
                      {asset.code}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {asset.structureType.name}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {asset.zone.province.name} - {asset.zone.name}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {asset.status}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {asset.digital ? "Yes" : "No"}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {asset.illuminated ? "Yes" : "No"}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {asset._count.faces}
                    </td>
                  </tr>
                ))}
                {!assetsQuery.data?.assets.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-4 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      No assets found.
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
