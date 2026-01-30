"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
const facingOptions = ["TRAFFIC", "OPPOSITE_TRAFFIC"] as const;
const facingLabels: Record<(typeof facingOptions)[number], string> = {
  TRAFFIC: "TRÁFICO",
  OPPOSITE_TRAFFIC: "TRÁFICO OPUESTO",
};

type FaceStatus = (typeof statusOptions)[number];
type FaceFacing = (typeof facingOptions)[number];

export function NewFaceForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const assetsQuery = trpc.inventory.assets.list.useQuery({ take: 100 });
  const positionsQuery = trpc.inventory.facePositions.list.useQuery();

  const [form, setForm] = useState({
    assetId: "",
    code: "",
    positionId: "",
    width: "",
    height: "",
    facing: "TRAFFIC" as FaceFacing,
    status: "ACTIVE" as FaceStatus,
    visibilityNotes: "",
    restrictions: "",
    notes: "",
  });

  const createFace = trpc.inventory.faces.create.useMutation({
    onSuccess: () => {
      utils.inventory.faces.list.invalidate();
      router.push("/admin/inventory/faces");
    },
  });

  const canSave =
    form.assetId &&
    form.code.trim() &&
    form.width.trim() &&
    form.height.trim();

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave) return;
          createFace.mutate({
            assetId: form.assetId,
            code: form.code.trim(),
            positionId: form.positionId || undefined,
            width: Number(form.width),
            height: Number(form.height),
            facing: form.facing,
            status: form.status,
            visibilityNotes: form.visibilityNotes.trim() || undefined,
            restrictions: form.restrictions.trim() || undefined,
            notes: form.notes.trim() || undefined,
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Activo
            </label>
            <select
              value={form.assetId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, assetId: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Seleccionar</option>
              {assetsQuery.data?.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Código
            </label>
            <input
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Posición
            </label>
            <select
              value={form.positionId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  positionId: event.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Seleccionar</option>
              {positionsQuery.data?.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Ancho
              </label>
              <input
                type="number"
                step="0.01"
                value={form.width}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, width: event.target.value }))
                }
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Alto
              </label>
              <input
                type="number"
                step="0.01"
                value={form.height}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, height: event.target.value }))
                }
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Orientación
            </label>
            <select
              value={form.facing}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  facing: event.target.value as FaceFacing,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              {facingOptions.map((option) => (
                <option key={option} value={option}>
                  {facingLabels[option]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Estado
            </label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as FaceStatus,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Notas de Visibilidad
            </label>
            <textarea
              value={form.visibilityNotes}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  visibilityNotes: event.target.value,
                }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Restricciones
            </label>
            <textarea
              value={form.restrictions}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  restrictions: event.target.value,
                }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={!canSave || createFace.isPending}>
            {createFace.isPending ? "Guardando..." : "Crear Cara"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/inventory/faces">Cancelar</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
