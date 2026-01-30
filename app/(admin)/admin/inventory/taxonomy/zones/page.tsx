"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { ImagePlus, Pencil, X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function ZonesPage() {
  const [name, setName] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
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
    },
  });
  const updateZone = trpc.inventory.zones.update.useMutation({
    onSuccess: () => {
      utils.inventory.zones.list.invalidate();
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Zones
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Manage zones by province with images.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
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
              disabled={
                !name.trim() || !provinceId || createZone.isPending || isUploading
              }
            >
              {createZone.isPending ? "Saving..." : "Add Zone"}
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
              {isUploading ? "Uploading..." : "Upload Image"}
            </Button>
            {imageUrl && (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Preview"
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
                          alt="Preview"
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
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
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
              No zones yet.
            </div>
          )}
        </div>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/inventory/taxonomy">Back to taxonomy</Link>
      </Button>
    </div>
  );
}
