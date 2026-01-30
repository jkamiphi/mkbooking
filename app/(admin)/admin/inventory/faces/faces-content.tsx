"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
const statusLabels: Record<(typeof statusOptions)[number], string> = {
  ACTIVE: "ACTIVO",
  INACTIVE: "INACTIVO",
  MAINTENANCE: "MANTENIMIENTO",
  RETIRED: "RETIRADO",
};
const facingLabels: Record<string, string> = {
  TRAFFIC: "TRÁFICO",
  OPPOSITE_TRAFFIC: "TRÁFICO OPUESTO",
};

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
            <option value="">Todos los activos</option>
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
            <option value="">Todos los estados</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {statusLabels[option]}
              </option>
            ))}
          </select>
        </div>
        <Button asChild>
          <Link href="/admin/inventory/faces/new">Nueva Cara</Link>
        </Button>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Lista de Caras
        </h2>
        {facesQuery.isLoading ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Cargando caras...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-4">Activo</th>
                  <th className="py-2 pr-4">Cara</th>
                  <th className="py-2 pr-4">Posición</th>
                  <th className="py-2 pr-4">Tamaño</th>
                  <th className="py-2 pr-4">Orientación</th>
                  <th className="py-2 pr-4">Estado</th>
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
                      {facingLabels[face.facing] ?? face.facing}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {statusLabels[face.status as (typeof statusOptions)[number]] ?? face.status}
                    </td>
                  </tr>
                ))}
                {!facesQuery.data?.faces.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      No se encontraron caras.
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
