"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ImageGalleryField,
  type ImageGalleryItem,
} from "@/components/inventory/image-gallery-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import type { AppRouter } from "@/lib/trpc/routers";

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
type RouterOutputs = inferRouterOutputs<AppRouter>;
type FaceGetOutput = NonNullable<RouterOutputs["inventory"]["faces"]["get"]>;

type FaceFormValues = {
  assetId: string;
  code: string;
  positionId: string;
  width: string;
  height: string;
  productionCostMonthly: string;
  facing: FaceFacing;
  status: FaceStatus;
  visibilityNotes: string;
  restrictions: string;
  notes: string;
};

type ProductionSpecFormValues = {
  material: string;
  mountingTypeId: string;
  bleedCm: string;
  safeMarginCm: string;
  dpiRecommended: string;
  fileFormat: string;
  installNotes: string;
  uninstallNotes: string;
};

function toDateInputValue(value: unknown) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function parseOptionalNumberInput(value: string) {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalIntegerInput(value: string) {
  const parsed = parseOptionalNumberInput(value);
  if (parsed === undefined) return undefined;
  if (parsed === null || !Number.isInteger(parsed)) return null;
  return parsed;
}

function mapFaceToForm(
  face: FaceGetOutput
): FaceFormValues {
  return {
    assetId: face.assetId,
    code: face.code,
    positionId: face.positionId ?? "",
    width: String(face.width),
    height: String(face.height),
    productionCostMonthly:
      face.productionCostMonthly === null || face.productionCostMonthly === undefined
        ? ""
        : String(face.productionCostMonthly),
    facing: face.facing as FaceFacing,
    status: face.status as FaceStatus,
    visibilityNotes: face.visibilityNotes ?? "",
    restrictions: face.restrictions ?? "",
    notes: face.notes ?? "",
  };
}

function mapFaceImages(face: FaceGetOutput): ImageGalleryItem[] {
  return (face.images ?? []).map((image) => ({
    id: image.id,
    image: image.image,
    caption: image.caption ?? "",
    isPrimary: image.isPrimary,
  }));
}

export function EditFaceForm({ faceId }: { faceId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<FaceFormValues>>({});
  const [imageDraft, setImageDraft] = useState<ImageGalleryItem[] | null>(null);
  const [productionSpecDraft, setProductionSpecDraft] = useState<
    Partial<ProductionSpecFormValues>
  >({});
  const [permitForm, setPermitForm] = useState({
    permitNumber: "",
    authority: "",
    issuedDate: "",
    expiresDate: "",
    document: "",
    notes: "",
  });
  const [maintenanceForm, setMaintenanceForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
    notes: "",
  });

  const faceQuery = trpc.inventory.faces.get.useQuery({ id: faceId });
  const assetsQuery = trpc.inventory.assets.list.useQuery({ take: 100 });
  const positionsQuery = trpc.inventory.facePositions.list.useQuery();
  const mountingTypesQuery = trpc.inventory.mountingTypes.list.useQuery();
  const permitsQuery = trpc.inventory.permits.list.useQuery(
    faceQuery.data
      ? { assetId: faceQuery.data.assetId, faceId: faceId, take: 100 }
      : undefined,
    { enabled: Boolean(faceQuery.data?.assetId) }
  );
  const maintenanceQuery = trpc.inventory.maintenanceWindows.list.useQuery(
    faceQuery.data
      ? { assetId: faceQuery.data.assetId, faceId: faceId, take: 100 }
      : undefined,
    { enabled: Boolean(faceQuery.data?.assetId) }
  );

  const form = useMemo(() => {
    if (!faceQuery.data) return null;
    return {
      ...mapFaceToForm(faceQuery.data),
      ...draft,
    } satisfies FaceFormValues;
  }, [faceQuery.data, draft]);
  const images = useMemo(() => {
    if (imageDraft) {
      return imageDraft;
    }

    if (!faceQuery.data) {
      return [];
    }

    return mapFaceImages(faceQuery.data);
  }, [faceQuery.data, imageDraft]);

  const productionSpecForm = useMemo(() => {
    if (!faceQuery.data) return null;
    return {
      material: faceQuery.data.productionSpec?.material ?? "",
      mountingTypeId: faceQuery.data.productionSpec?.mountingTypeId ?? "",
      bleedCm:
        faceQuery.data.productionSpec?.bleedCm === null ||
        faceQuery.data.productionSpec?.bleedCm === undefined
          ? ""
          : String(faceQuery.data.productionSpec.bleedCm),
      safeMarginCm:
        faceQuery.data.productionSpec?.safeMarginCm === null ||
        faceQuery.data.productionSpec?.safeMarginCm === undefined
          ? ""
          : String(faceQuery.data.productionSpec.safeMarginCm),
      dpiRecommended:
        faceQuery.data.productionSpec?.dpiRecommended === null ||
        faceQuery.data.productionSpec?.dpiRecommended === undefined
          ? ""
          : String(faceQuery.data.productionSpec.dpiRecommended),
      fileFormat: faceQuery.data.productionSpec?.fileFormat ?? "",
      installNotes: faceQuery.data.productionSpec?.installNotes ?? "",
      uninstallNotes: faceQuery.data.productionSpec?.uninstallNotes ?? "",
      ...productionSpecDraft,
    } satisfies ProductionSpecFormValues;
  }, [faceQuery.data, productionSpecDraft]);

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
  const upsertProductionSpec = trpc.inventory.productionSpecs.upsert.useMutation({
    onSuccess: async () => {
      await utils.inventory.faces.get.invalidate({ id: faceId });
      toast.success("Ficha técnica actualizada.");
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });
  const createPermit = trpc.inventory.permits.create.useMutation({
    onSuccess: async () => {
      if (faceQuery.data?.assetId) {
        await permitsQuery.refetch();
      }
      setPermitForm({
        permitNumber: "",
        authority: "",
        issuedDate: "",
        expiresDate: "",
        document: "",
        notes: "",
      });
      toast.success("Permiso registrado.");
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });
  const createMaintenanceWindow = trpc.inventory.maintenanceWindows.create.useMutation({
    onSuccess: async () => {
      if (faceQuery.data?.assetId) {
        await maintenanceQuery.refetch();
      }
      setMaintenanceForm({
        startDate: "",
        endDate: "",
        reason: "",
        notes: "",
      });
      toast.success("Ventana de mantenimiento registrada.");
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
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
    <div className="space-y-6">
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
              const productionCostMonthly = form.productionCostMonthly.trim()
                ? Number(form.productionCostMonthly)
                : undefined;
              if (
                productionCostMonthly !== undefined &&
                (!Number.isFinite(productionCostMonthly) || productionCostMonthly < 0)
              ) {
                setError("La producción mensual debe ser un monto válido.");
                return;
              }

              updateFace.mutate({
                id: faceId,
                assetId: form.assetId,
                code: form.code.trim(),
                positionId: form.positionId,
                width,
                height,
                productionCostMonthly,
                facing: form.facing,
                status: form.status,
                visibilityNotes: form.visibilityNotes.trim(),
                restrictions: form.restrictions.trim(),
                notes: form.notes.trim(),
                images: images.map((image) => ({
                  id: image.id,
                  image: image.image,
                  caption: image.caption.trim() || undefined,
                  isPrimary: image.isPrimary,
                })),
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
                <Label className="mb-1.5 block">Producción Mensual (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej. 1800.00"
                  value={form.productionCostMonthly}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      productionCostMonthly: event.target.value,
                    }))
                  }
                />
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
              <div className="md:col-span-2">
                <ImageGalleryField
                  images={images}
                  scope="inventory-face-image"
                  label="Imágenes de la cara"
                  description="Define una imagen principal para el catálogo y búsqueda."
                  onChange={setImageDraft}
                  disabled={updateFace.isPending}
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

      <Card>
        <CardHeader>
          <CardTitle>Ficha Técnica de Producción</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!productionSpecForm) return;
              const bleedCm = parseOptionalNumberInput(productionSpecForm.bleedCm);
              if (bleedCm === null || (bleedCm !== undefined && bleedCm < 0)) {
                toast.error("El sangrado debe ser un valor válido.");
                return;
              }
              const safeMarginCm = parseOptionalNumberInput(
                productionSpecForm.safeMarginCm
              );
              if (
                safeMarginCm === null ||
                (safeMarginCm !== undefined && safeMarginCm < 0)
              ) {
                toast.error("El margen seguro debe ser un valor válido.");
                return;
              }
              const dpiRecommended = parseOptionalIntegerInput(
                productionSpecForm.dpiRecommended
              );
              if (
                dpiRecommended === null ||
                (dpiRecommended !== undefined && dpiRecommended < 1)
              ) {
                toast.error("El DPI recomendado debe ser un número entero válido.");
                return;
              }
              upsertProductionSpec.mutate({
                faceId,
                material: productionSpecForm.material.trim() || undefined,
                mountingTypeId: productionSpecForm.mountingTypeId || undefined,
                bleedCm,
                safeMarginCm,
                dpiRecommended,
                fileFormat: productionSpecForm.fileFormat.trim() || undefined,
                installNotes: productionSpecForm.installNotes.trim() || undefined,
                uninstallNotes: productionSpecForm.uninstallNotes.trim() || undefined,
              });
            }}
          >
            <div>
              <Label className="mb-1.5 block">Material</Label>
              <Input
                value={productionSpecForm?.material ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    material: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Tipo de montaje</Label>
              <SelectNative
                value={productionSpecForm?.mountingTypeId ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    mountingTypeId: event.target.value,
                  }))
                }
              >
                <option value="">Seleccionar</option>
                {mountingTypesQuery.data?.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <Label className="mb-1.5 block">Sangrado (cm)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={productionSpecForm?.bleedCm ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    bleedCm: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Margen seguro (cm)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={productionSpecForm?.safeMarginCm ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    safeMarginCm: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">DPI recomendado</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={productionSpecForm?.dpiRecommended ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    dpiRecommended: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Formato</Label>
              <Input
                value={productionSpecForm?.fileFormat ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    fileFormat: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas de instalación</Label>
              <Textarea
                rows={2}
                value={productionSpecForm?.installNotes ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    installNotes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas de desmontaje</Label>
              <Textarea
                rows={2}
                value={productionSpecForm?.uninstallNotes ?? ""}
                onChange={(event) =>
                  setProductionSpecDraft((prev) => ({
                    ...prev,
                    uninstallNotes: event.target.value,
                  }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={upsertProductionSpec.isPending}>
                {upsertProductionSpec.isPending
                  ? "Guardando ficha..."
                  : "Guardar ficha técnica"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permisos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!faceQuery.data?.assetId) return;
              createPermit.mutate({
                assetId: faceQuery.data.assetId,
                faceId,
                permitNumber: permitForm.permitNumber.trim() || undefined,
                authority: permitForm.authority.trim() || undefined,
                issuedDate: permitForm.issuedDate
                  ? new Date(permitForm.issuedDate)
                  : undefined,
                expiresDate: permitForm.expiresDate
                  ? new Date(permitForm.expiresDate)
                  : undefined,
                document: permitForm.document.trim() || undefined,
                notes: permitForm.notes.trim() || undefined,
              });
            }}
          >
            <div>
              <Label className="mb-1.5 block">Número de permiso</Label>
              <Input
                value={permitForm.permitNumber}
                onChange={(event) =>
                  setPermitForm((prev) => ({
                    ...prev,
                    permitNumber: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Autoridad</Label>
              <Input
                value={permitForm.authority}
                onChange={(event) =>
                  setPermitForm((prev) => ({ ...prev, authority: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de emisión</Label>
              <Input
                type="date"
                value={permitForm.issuedDate}
                onChange={(event) =>
                  setPermitForm((prev) => ({ ...prev, issuedDate: event.target.value }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fecha de vencimiento</Label>
              <Input
                type="date"
                value={permitForm.expiresDate}
                onChange={(event) =>
                  setPermitForm((prev) => ({ ...prev, expiresDate: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Documento (URL)</Label>
              <Input
                value={permitForm.document}
                onChange={(event) =>
                  setPermitForm((prev) => ({ ...prev, document: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea
                rows={2}
                value={permitForm.notes}
                onChange={(event) =>
                  setPermitForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createPermit.isPending}>
                {createPermit.isPending ? "Guardando permiso..." : "Registrar permiso"}
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {(permitsQuery.data ?? []).map((permit) => (
              <div key={permit.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {permit.permitNumber || "Sin número"} · {permit.authority || "Autoridad N/D"}
                </p>
                <p className="text-muted-foreground">
                  Emisión: {toDateInputValue(permit.issuedDate) || "N/D"} · Vence:{" "}
                  {toDateInputValue(permit.expiresDate) || "N/D"}
                </p>
              </div>
            ))}
            {!permitsQuery.isLoading && (permitsQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Sin permisos registrados.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mantenimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!faceQuery.data?.assetId) return;
              if (!maintenanceForm.startDate || !maintenanceForm.endDate) {
                toast.error("Debes indicar fecha de inicio y fin.");
                return;
              }
              if (!maintenanceForm.reason.trim()) {
                toast.error("Debes indicar el motivo del mantenimiento.");
                return;
              }
              createMaintenanceWindow.mutate({
                assetId: faceQuery.data.assetId,
                faceId,
                startDate: new Date(maintenanceForm.startDate),
                endDate: new Date(maintenanceForm.endDate),
                reason: maintenanceForm.reason.trim(),
                notes: maintenanceForm.notes.trim() || undefined,
              });
            }}
          >
            <div>
              <Label className="mb-1.5 block">Inicio</Label>
              <Input
                type="date"
                value={maintenanceForm.startDate}
                onChange={(event) =>
                  setMaintenanceForm((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Fin</Label>
              <Input
                type="date"
                value={maintenanceForm.endDate}
                onChange={(event) =>
                  setMaintenanceForm((prev) => ({ ...prev, endDate: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Motivo</Label>
              <Input
                value={maintenanceForm.reason}
                onChange={(event) =>
                  setMaintenanceForm((prev) => ({ ...prev, reason: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Notas</Label>
              <Textarea
                rows={2}
                value={maintenanceForm.notes}
                onChange={(event) =>
                  setMaintenanceForm((prev) => ({ ...prev, notes: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={createMaintenanceWindow.isPending}>
                {createMaintenanceWindow.isPending
                  ? "Guardando mantenimiento..."
                  : "Registrar mantenimiento"}
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {(maintenanceQuery.data ?? []).map((window) => (
              <div key={window.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{window.reason}</p>
                <p className="text-muted-foreground">
                  {toDateInputValue(window.startDate) || "N/D"} -{" "}
                  {toDateInputValue(window.endDate) || "N/D"}
                </p>
              </div>
            ))}
            {!maintenanceQuery.isLoading && (maintenanceQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin mantenimientos registrados.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
