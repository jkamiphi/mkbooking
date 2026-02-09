"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ImagePlus, Pencil, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function StructureTypesPage() {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const typesQuery = trpc.inventory.structureTypes.list.useQuery();
  const createType = trpc.inventory.structureTypes.create.useMutation({
    onSuccess: () => {
      utils.inventory.structureTypes.list.invalidate();
      setName("");
      setImageUrl("");
    },
  });
  const updateType = trpc.inventory.structureTypes.update.useMutation({
    onSuccess: () => {
      utils.inventory.structureTypes.list.invalidate();
      setEditingId(null);
    },
  });

  async function uploadFile(file: File): Promise<string | null> {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const blob = await response.json();
      return blob.url;
    } catch {
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

  function startEdit(type: { id: string; name: string; imageUrl: string | null }) {
    setEditingId(type.id);
    setEditName(type.name);
    setEditImageUrl(type.imageUrl || "");
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Tipos de estructura"
        description="Gestionar tipos de estructura (Mupi, Valla, etc.) con imágenes."
      />
      <Card>
        <CardContent className="space-y-4 pt-6">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createType.mutate({
              name: name.trim(),
              imageUrl: imageUrl || undefined,
            });
          }}
        >
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nombre del tipo de estructura"
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={!name.trim() || createType.isPending || isUploading}
            >
              {createType.isPending ? "Guardando..." : "Agregar Tipo"}
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
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {typesQuery.data?.map((type) => (
            <div
              key={type.id}
              className="relative group rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden bg-neutral-50 dark:bg-neutral-800"
            >
              {editingId === type.id ? (
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
                        updateType.mutate({
                          id: type.id,
                          name: editName.trim() || undefined,
                          imageUrl: editImageUrl || null,
                        })
                      }
                      disabled={updateType.isPending || isUploading}
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
                  {type.imageUrl ? (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img
                        src={type.imageUrl}
                        alt={type.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] flex items-center justify-center bg-gradient-to-br from-[#fcb814]/20 to-[#0359A8]/20">
                      <ImagePlus className="h-10 w-10 text-neutral-400" />
                    </div>
                  )}
                  <div className="p-3 flex items-center justify-between">
                    <span className="font-medium text-neutral-900 dark:text-white text-sm">
                      {type.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEdit(type)}
                      className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                    >
                      <Pencil className="h-4 w-4 text-neutral-500" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {!typesQuery.data?.length && (
            <div className="col-span-full text-center py-8 text-neutral-500 dark:text-neutral-400">
              Aún no hay tipos de estructura.
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
