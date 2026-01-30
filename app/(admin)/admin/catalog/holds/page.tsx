"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const statusOptions = ["ACTIVE", "EXPIRED", "RELEASED", "CONVERTED"] as const;

export default function HoldsPage() {
  const [faceId, setFaceId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const utils = trpc.useUtils();
  const facesQuery = trpc.inventory.faces.list.useQuery({ take: 100 });
  const orgsQuery = trpc.organization.list.useQuery({ skip: 0, take: 100 });
  const holdsQuery = trpc.catalog.holds.list.useQuery({
    status: statusFilter
      ? (statusFilter as (typeof statusOptions)[number])
      : undefined,
  });

  const createHold = trpc.catalog.holds.create.useMutation({
    onSuccess: () => {
      utils.catalog.holds.list.invalidate();
      setFaceId("");
      setOrganizationId("");
    },
  });

  const releaseHold = trpc.catalog.holds.release.useMutation({
    onSuccess: () => {
      utils.catalog.holds.list.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Holds
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Holds lock faces for 24 hours.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!faceId) return;
            createHold.mutate({
              faceId,
              organizationId: organizationId || undefined,
            });
          }}
        >
          <select
            value={faceId}
            onChange={(event) => setFaceId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">Select face</option>
            {facesQuery.data?.faces.map((face) => (
              <option key={face.id} value={face.id}>
                {face.asset.code} - {face.code}
              </option>
            ))}
          </select>
          <select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">Optional organization</option>
            {orgsQuery.data?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!faceId || createHold.isPending}>
            {createHold.isPending ? "Saving..." : "Create Hold"}
          </Button>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">All status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4">Face</th>
                <th className="py-2 pr-4">Organization</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Expires</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {holdsQuery.data?.map((hold) => (
                <tr
                  key={hold.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4 text-neutral-900 dark:text-white">
                    {hold.face.face.asset.code} - {hold.face.face.code}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {hold.organization?.name ?? "-"}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {hold.status}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {hold.expiresAt.toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    {hold.status === "ACTIVE" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => releaseHold.mutate({ holdId: hold.id })}
                      >
                        Release
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!holdsQuery.data?.length && (
                <tr>
                  <td className="py-4 text-center text-neutral-500 dark:text-neutral-400" colSpan={5}>
                    No holds yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
