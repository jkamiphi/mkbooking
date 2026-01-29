"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function PriceRulesPage() {
  const [faceId, setFaceId] = useState("");
  const [structureTypeId, setStructureTypeId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const utils = trpc.useUtils();
  const facesQuery = trpc.inventory.faces.list.useQuery({ take: 200 });
  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const orgsQuery = trpc.organization.list.useQuery({ skip: 0, take: 200 });
  const rulesQuery = trpc.catalog.priceRules.list.useQuery();

  const createRule = trpc.catalog.priceRules.create.useMutation({
    onSuccess: () => {
      utils.catalog.priceRules.list.invalidate();
      setPrice("");
      setStartDate("");
      setEndDate("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Price Rules
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Define pricing by face, structure type, zone, and customer.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!price.trim()) return;
            createRule.mutate({
              faceId: faceId || undefined,
              structureTypeId: structureTypeId || undefined,
              zoneId: zoneId || undefined,
              organizationId: organizationId || undefined,
              priceDaily: Number(price),
              startDate: startDate ? new Date(startDate) : undefined,
              endDate: endDate ? new Date(endDate) : undefined,
              isActive: true,
            });
          }}
        >
          <select
            value={faceId}
            onChange={(event) => setFaceId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All faces</option>
            {facesQuery.data?.faces.map((face) => (
              <option key={face.id} value={face.id}>
                {face.asset.code} - {face.code}
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
          <select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All customers</option>
            {orgsQuery.data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="Daily price"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <Button type="submit" disabled={!price.trim() || createRule.isPending}>
            {createRule.isPending ? "Saving..." : "Add Rule"}
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4">Scope</th>
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Start</th>
                <th className="py-2 pr-4">End</th>
                <th className="py-2 pr-4">Active</th>
              </tr>
            </thead>
            <tbody>
              {rulesQuery.data?.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4 text-neutral-900 dark:text-white">
                    {rule.face?.face
                      ? `${rule.face.face.asset.code} - ${rule.face.face.code}`
                      : rule.zone
                      ? `${rule.zone.province.name} - ${rule.zone.name}`
                      : rule.structureType
                      ? rule.structureType.name
                      : "Global"}
                    {rule.organization ? ` · ${rule.organization.name}` : ""}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {rule.currency} {rule.priceDaily}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {rule.startDate.toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {rule.endDate ? rule.endDate.toLocaleDateString() : "-"}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {rule.isActive ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
              {!rulesQuery.data?.length && (
                <tr>
                  <td className="py-4 text-center text-neutral-500 dark:text-neutral-400" colSpan={5}>
                    No price rules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/catalog/pricing">Back to pricing</Link>
      </Button>
    </div>
  );
}
