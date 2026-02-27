"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ImageGalleryField,
  type ImageGalleryItem,
} from "@/components/inventory/image-gallery-field";
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

export function NewFaceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAssetId = searchParams.get("assetId")?.trim() ?? "";
  const utils = trpc.useUtils();
  const assetsQuery = trpc.inventory.assets.list.useQuery({ take: 100 });
  const positionsQuery = trpc.inventory.facePositions.list.useQuery();
  const [images, setImages] = useState<ImageGalleryItem[]>([]);

  const [form, setForm] = useState({
    assetId: preselectedAssetId,
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
    <Card>
      <CardContent className="pt-6">
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
            images: images.map((image) => ({
              id: image.id,
              image: image.image,
              caption: image.caption.trim() || undefined,
              isPrimary: image.isPrimary,
            })),
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block">Activo</Label>
            <SelectNative
              value={form.assetId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, assetId: event.target.value }))
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
                setForm((prev) => ({ ...prev, code: event.target.value }))
              }
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Posición</Label>
            <SelectNative
              value={form.positionId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  positionId: event.target.value,
                }))
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
                  setForm((prev) => ({ ...prev, width: event.target.value }))
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
                  setForm((prev) => ({ ...prev, height: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">Orientación</Label>
            <SelectNative
              value={form.facing}
              onChange={(event) =>
                setForm((prev) => ({
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
                setForm((prev) => ({
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
                setForm((prev) => ({
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
                setForm((prev) => ({
                  ...prev,
                  restrictions: event.target.value,
                }))
              }
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <Label className="mb-1.5 block">Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={2}
            />
          </div>
          <div className="md:col-span-2">
            <ImageGalleryField
              images={images}
              scope="inventory-face-image"
              label="Imágenes de la cara"
              description="Agrega evidencia visual de la cara. Marca una imagen principal."
              onChange={setImages}
              disabled={createFace.isPending}
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
      </CardContent>
    </Card>
  );
}
