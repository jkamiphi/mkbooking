"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ImageGalleryItem {
  id?: string;
  image: string;
  caption: string;
  isPrimary: boolean;
}

type ImageGalleryFieldProps = {
  images: ImageGalleryItem[];
  scope:
    | "inventory-zone"
    | "inventory-structure-type"
    | "inventory-asset-image"
    | "inventory-face-image"
    | "catalog-face-primary";
  label: string;
  description?: string;
  disabled?: boolean;
  onChange: (nextImages: ImageGalleryItem[]) => void;
};

function normalizePrimaryImage(images: ImageGalleryItem[]) {
  if (images.length === 0) {
    return images;
  }

  const currentPrimaryIndex = images.findIndex((image) => image.isPrimary);
  const primaryIndex = currentPrimaryIndex >= 0 ? currentPrimaryIndex : 0;

  return images.map((image, index) => ({
    ...image,
    isPrimary: index === primaryIndex,
  }));
}

export function ImageGalleryField({
  images,
  scope,
  label,
  description,
  disabled,
  onChange,
}: ImageGalleryFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  function updateImages(nextImages: ImageGalleryItem[]) {
    onChange(normalizePrimaryImage(nextImages));
  }

  async function uploadFile(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const responsePayload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(responsePayload?.error || "No se pudo subir la imagen.");
    }

    const payload = (await response.json()) as { url: string };
    return payload.url || null;
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const uploadedImages: ImageGalleryItem[] = [];
      for (const file of selectedFiles) {
        const uploadedUrl = await uploadFile(file);
        if (!uploadedUrl) continue;

        uploadedImages.push({
          caption: "",
          image: uploadedUrl,
          isPrimary: false,
        });
      }

      if (uploadedImages.length > 0) {
        updateImages([...images, ...uploadedImages]);
      }
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir una o más imágenes.";
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-neutral-200 p-4">
      <div className="space-y-1">
        <Label className="text-sm font-medium">{label}</Label>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          multiple
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="mr-2 h-4 w-4" />
          {isUploading ? "Subiendo..." : "Agregar imágenes"}
        </Button>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay imágenes cargadas.</p>
      ) : (
        <div className="space-y-3">
          {images.map((image, index) => (
            <div
              key={`${image.id ?? "new"}-${index}-${image.image}`}
              className="grid gap-3 rounded-lg border border-neutral-200 p-3 md:grid-cols-[80px_1fr_auto]"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-md bg-neutral-100">
                <img
                  src={image.image}
                  alt={`Imagen ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-2">
                <Input
                  value={image.caption}
                  disabled={disabled}
                  placeholder="Descripción (opcional)"
                  onChange={(event) => {
                    updateImages(
                      images.map((currentImage, currentIndex) =>
                        currentIndex === index
                          ? { ...currentImage, caption: event.target.value }
                          : currentImage
                      )
                    );
                  }}
                />
                <p className="truncate text-[11px] text-muted-foreground">{image.image}</p>
              </div>

              <div className="flex items-start gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant={image.isPrimary ? "default" : "outline"}
                  disabled={disabled}
                  onClick={() => {
                    updateImages(
                      images.map((currentImage, currentIndex) => ({
                        ...currentImage,
                        isPrimary: currentIndex === index,
                      }))
                    );
                  }}
                  title="Marcar como principal"
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={disabled || index === 0}
                  onClick={() => {
                    const nextImages = [...images];
                    const previousImage = nextImages[index - 1];
                    nextImages[index - 1] = nextImages[index];
                    nextImages[index] = previousImage;
                    updateImages(nextImages);
                  }}
                  title="Mover arriba"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={disabled || index === images.length - 1}
                  onClick={() => {
                    const nextImages = [...images];
                    const nextImage = nextImages[index + 1];
                    nextImages[index + 1] = nextImages[index];
                    nextImages[index] = nextImage;
                    updateImages(nextImages);
                  }}
                  title="Mover abajo"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={disabled}
                  onClick={() => {
                    const nextImages = images.filter((_, currentIndex) => currentIndex !== index);
                    updateImages(nextImages);
                  }}
                  title="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
