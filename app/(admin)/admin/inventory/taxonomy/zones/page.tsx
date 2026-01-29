"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function ZonesPage() {
  const [name, setName] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const utils = trpc.useUtils();
  const provincesQuery = trpc.inventory.provinces.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const createZone = trpc.inventory.zones.create.useMutation({
    onSuccess: () => {
      utils.inventory.zones.list.invalidate();
      setName("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Zones
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage zones by province.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !provinceId) return;
            createZone.mutate({ name: name.trim(), provinceId });
          }}
        >
          <select
            value={provinceId}
            onChange={(event) => setProvinceId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">Select province</option>
            {provincesQuery.data?.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Zone name"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <Button
            type="submit"
            disabled={!name.trim() || !provinceId || createZone.isPending}
          >
            {createZone.isPending ? "Saving..." : "Add Zone"}
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4">Province</th>
                <th className="py-2 pr-4">Zone</th>
              </tr>
            </thead>
            <tbody>
              {zonesQuery.data?.map((zone) => (
                <tr
                  key={zone.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4 text-neutral-900 dark:text-white">
                    {zone.province.name}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {zone.name}
                  </td>
                </tr>
              ))}
              {!zonesQuery.data?.length && (
                <tr>
                  <td className="py-4 text-center text-neutral-500 dark:text-neutral-400" colSpan={2}>
                    No zones yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/inventory/taxonomy">Back to taxonomy</Link>
      </Button>
    </div>
  );
}
