"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ImagePlus, Pencil, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";

export default function ZonesPage() {
  const [name, setName] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const provincesQuery = trpc.inventory.provinces.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const createZone = trpc.inventory.zones.create.useMutation({
    onSuccess: () => {
      utils.inventory.zones.list.invalidate();
      setName("");
      setImageUrl("");
      setUploadError(null);
      toast.success("Zona creada.");
    },
    onError: (error) => {
      toast.error("No se pudo crear la zona", {
        description: error.message,
      });
    },
  });
  const updateZone = trpc.inventory.zones.update.useMutation({
    onSuccess: () => {
      utils.inventory.zones.list.invalidate();
      setEditingId(null);
      setUploadError(null);
      toast.success("Zona actualizada.");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar la zona", {
        description: error.message,
      });
    },
  });

  async function uploadFile(file: File): Promise<string | null> {
    setIsUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("scope", "inventory-zone");
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Upload failed");
      }
      const blob = await response.json();
      return blob.url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo subir la imagen";
      setUploadError(message);
      toast.error("Error al subir imagen", {
        description: message,
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      const url = await uploadFile(file);
      if (url) setImageUrl(url);
    }
  }

  async function handleEditFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (file) {
      const url = await uploadFile(file);
      if (url) setEditImageUrl(url);
    }
  }

  function startEdit(zone: {
    id: string;
    name: string;
    imageUrl: string | null;
  }) {
    setEditingId(zone.id);
    setEditName(zone.name);
    setEditImageUrl(zone.imageUrl || "");
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Zonas"
        description="Gestionar zonas por provincia con imágenes."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !provinceId) return;
            createZone.mutate({
              name: name.trim(),
              provinceId,
              imageUrl: imageUrl || undefined,
            });
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SelectNative
              value={provinceId}
              onChange={(event) => setProvinceId(event.target.value)}
            >
              <option value="">Seleccionar provincia</option>
              {provincesQuery.data?.map((province) => (
                <option key={province.id} value={province.id}>
                  {province.name}
                </option>
              ))}
            </SelectNative>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre de zona"
            />
            <Button
              type="submit"
              disabled={
                !name.trim() || !provinceId || createZone.isPending || isUploading
              }
            >
              {createZone.isPending ? "Guardando..." : "Agregar Zona"}
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Subiendo..." : "Subir Imagen"}
            </Button>
            {imageUrl && (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Vista previa"
                  className="h-12 w-12 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          {uploadError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {uploadError}
            </p>
          ) : null}
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {zonesQuery.data?.map((zone) => (
            <div
              key={zone.id}
              className="relative group rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-800"
            >
              {editingId === zone.id ? (
                <div className="p-4 space-y-3">
                  <input
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm dark:bg-neutral-900 dark:text-white"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      ref={editFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleEditFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <ImagePlus className="h-4 w-4" />
                    </Button>
                    {editImageUrl && (
                      <div className="relative">
                        <img
                          src={editImageUrl}
                          alt="Vista previa"
                          className="h-8 w-8 rounded object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setEditImageUrl("")}
                          className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center"
                        >
                          <X className="h-2 w-2" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateZone.mutate({
                          id: zone.id,
                          name: editName.trim() || undefined,
                          imageUrl: editImageUrl || null,
                        })
                      }
                      disabled={updateZone.isPending || isUploading}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {zone.imageUrl ? (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={zone.imageUrl}
                        alt={zone.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-[#0359A8]/20 to-[#fcb814]/20">
                      <ImagePlus className="h-10 w-10 text-neutral-400" />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-neutral-900 dark:text-white text-sm">
                        {zone.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(zone)}
                        className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                      >
                        <Pencil className="h-4 w-4 text-neutral-500" />
                      </button>
                    </div>
                    <span className="text-xs text-neutral-500">
                      {zone.province.name}
                    </span>
                  </div>
                </>
              )}
            </div>
          ))}
          {!zonesQuery.data?.length && (
            <div className="col-span-full text-center py-8 text-neutral-500 dark:text-neutral-400">
              Aún no hay zonas.
            </div>
          )}
        </div>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/admin/inventory/taxonomy">Volver a taxonomía</Link>
      </Button>
    </AdminPageShell>
  );
}
