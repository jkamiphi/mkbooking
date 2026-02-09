"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
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

type FaceFormValues = {
  assetId: string;
  code: string;
  positionId: string;
  width: string;
  height: string;
  facing: FaceFacing;
  status: FaceStatus;
  visibilityNotes: string;
  restrictions: string;
  notes: string;
};

function mapFaceToForm(
  face: NonNullable<ReturnType<typeof trpc.inventory.faces.get.useQuery>["data"]>
): FaceFormValues {
  return {
    assetId: face.assetId,
    code: face.code,
    positionId: face.positionId ?? "",
    width: String(face.width),
    height: String(face.height),
    facing: face.facing as FaceFacing,
    status: face.status as FaceStatus,
    visibilityNotes: face.visibilityNotes ?? "",
    restrictions: face.restrictions ?? "",
    notes: face.notes ?? "",
  };
}

export function EditFaceForm({ faceId }: { faceId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<FaceFormValues>>({});

  const faceQuery = trpc.inventory.faces.get.useQuery({ id: faceId });
  const assetsQuery = trpc.inventory.assets.list.useQuery({ take: 100 });
  const positionsQuery = trpc.inventory.facePositions.list.useQuery();

  const form = useMemo(() => {
    if (!faceQuery.data) return null;
    return {
      ...mapFaceToForm(faceQuery.data),
      ...draft,
    } satisfies FaceFormValues;
  }, [faceQuery.data, draft]);

  const updateFace = trpc.inventory.faces.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.inventory.faces.list.invalidate(),
        utils.inventory.faces.get.invalidate({ id: faceId }),
      ]);
      toast.success("Cara actualizada correctamente.");
      router.push("/admin/inventory/faces");
    },
    onError: (mutationError) => {
      const message =
        mutationError.message.includes("Unique constraint")
          ? "Ya existe una cara con ese código para este activo."
          : mutationError.message;
      setError(message);
      toast.error(message);
    },
  });

  if (faceQuery.isLoading || !form) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Cargando datos de la cara...
        </CardContent>
      </Card>
    );
  }

  if (faceQuery.error) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-red-600">No se pudo cargar la cara para editar.</p>
          <Button variant="outline" onClick={() => void faceQuery.refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!faceQuery.data) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">Cara no encontrada.</p>
          <Button asChild variant="outline">
            <Link href="/admin/inventory/faces">Volver a caras</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canSave =
    form.assetId &&
    form.code.trim() &&
    form.width.trim() &&
    form.height.trim();

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);

            if (!canSave) return;

            const width = Number(form.width);
            const height = Number(form.height);
            if (!Number.isFinite(width) || width < 0) {
              setError("El ancho debe ser un número válido mayor o igual a 0.");
              return;
            }
            if (!Number.isFinite(height) || height < 0) {
              setError("El alto debe ser un número válido mayor o igual a 0.");
              return;
            }

            updateFace.mutate({
              id: faceId,
              assetId: form.assetId,
              code: form.code.trim(),
              positionId: form.positionId,
              width,
              height,
              facing: form.facing,
              status: form.status,
              visibilityNotes: form.visibilityNotes.trim(),
              restrictions: form.restrictions.trim(),
              notes: form.notes.trim(),
            });
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-1.5 block">Activo</Label>
              <SelectNative
                value={form.assetId}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, assetId: event.target.value }))
                }
              >
                <option value="">Seleccionar</option>
                {assetsQuery.data?.assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <Label className="mb-1.5 block">Código</Label>
              <Input
                value={form.code}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, code: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Posición</Label>
              <SelectNative
                value={form.positionId}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, positionId: event.target.value }))
                }
              >
                <option value="">Seleccionar</option>
                {positionsQuery.data?.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="mb-1.5 block">Ancho (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 12.50"
                  value={form.width}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, width: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Alto (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ej. 3.00"
                  value={form.height}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, height: event.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block">Orientación</Label>
              <SelectNative
                value={form.facing}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    facing: event.target.value as FaceFacing,
                  }))
                }
              >
                {facingOptions.map((option) => (
                  <option key={option} value={option}>
                    {facingLabels[option]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <Label className="mb-1.5 block">Estado</Label>
              <SelectNative
                value={form.status}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    status: event.target.value as FaceStatus,
                  }))
                }
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabels[option]}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas de Visibilidad</Label>
              <Textarea
                value={form.visibilityNotes}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    visibilityNotes: event.target.value,
                  }))
                }
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Restricciones</Label>
              <Textarea
                value={form.restrictions}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, restrictions: event.target.value }))
                }
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={2}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button type="submit" disabled={!canSave || updateFace.isPending}>
              {updateFace.isPending ? "Guardando..." : "Guardar cambios"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/inventory/faces">Cancelar</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
