"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Copy,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

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

const PAGE_SIZE = 25;
type FaceStatus = (typeof statusOptions)[number];

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function FacesContent() {
  const utils = trpc.useUtils();
  const [assetId, setAssetId] = useState("");
  const [status, setStatus] = useState<FaceStatus | "">("");
  const [page, setPage] = useState(0);
  const [updatingFaceId, setUpdatingFaceId] = useState<string | null>(null);

  const assetsQuery = trpc.inventory.assets.list.useQuery({ take: 100 });
  const facesQuery = trpc.inventory.faces.list.useQuery(
    {
      assetId: assetId || undefined,
      status: status || undefined,
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    },
    {
      placeholderData: (previousData) => previousData,
    }
  );

  const updateFaceStatusMutation = trpc.inventory.faces.update.useMutation({
    onSettled: () => {
      setUpdatingFaceId(null);
    },
  });

  const faces = facesQuery.data?.faces ?? [];
  const total = facesQuery.data?.total ?? 0;
  const hasMore = facesQuery.data?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrevious = page > 0;
  const hasFilters = assetId || status;

  const rangeLabel = useMemo(() => {
    if (total === 0) return "0 resultados";
    const start = page * PAGE_SIZE + 1;
    const end = Math.min((page + 1) * PAGE_SIZE, total);
    return `Mostrando ${start}-${end} de ${total}`;
  }, [page, total]);

  function clearFilters() {
    setAssetId("");
    setStatus("");
    setPage(0);
  }

  async function handleCopyCode(code: string, label: string) {
    const hasCopied = await copyToClipboard(code);
    if (hasCopied) {
      toast.success(`${label} ${code} copiado al portapapeles.`);
      return;
    }
    toast.error("No se pudo copiar el código. Intenta nuevamente.");
  }

  function changeFaceStatus(faceId: string, faceCode: string, nextStatus: FaceStatus) {
    setUpdatingFaceId(faceId);
    updateFaceStatusMutation.mutate(
      {
        id: faceId,
        status: nextStatus,
      },
      {
        onSuccess: async () => {
          await utils.inventory.faces.list.invalidate();
          toast.success(
            `${faceCode} actualizado a ${statusLabels[nextStatus].toLowerCase()}.`
          );
        },
        onError: () => {
          toast.error(`No se pudo actualizar el estado de ${faceCode}.`);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Filtros de caras</CardTitle>
            <p className="text-sm text-muted-foreground">
              Segmenta por activo y estado operativo.
            </p>
          </div>
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link href="/admin/inventory/faces/new">Nueva Cara</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="face-asset">Activo</Label>
              <SelectNative
                id="face-asset"
                value={assetId}
                onChange={(event) => {
                  setAssetId(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">Todos los activos</option>
                {assetsQuery.data?.assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="face-status">Estado</Label>
              <SelectNative
                id="face-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as FaceStatus | "");
                  setPage(0);
                }}
              >
                <option value="">Todos los estados</option>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {statusLabels[option]}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          {hasFilters ? (
            <div className="flex justify-end border-t pt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpiar filtros
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Lista de caras</CardTitle>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {facesQuery.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-2">
                  <p>No se pudo cargar el listado de caras.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void facesQuery.refetch()}
                    className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Activo</TableHead>
                <TableHead>Cara</TableHead>
                <TableHead>Posición</TableHead>
                <TableHead>Tamaño (m)</TableHead>
                <TableHead>Orientación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[72px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facesQuery.isLoading
                ? [...Array(6)].map((_, index) => (
                    <TableRow key={`face-skeleton-${index}`}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                : null}

              {!facesQuery.isLoading && faces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                    No se encontraron caras.
                  </TableCell>
                </TableRow>
              ) : null}

              {!facesQuery.isLoading
                ? faces.map((face) => {
                    const isUpdating = updatingFaceId === face.id;
                    return (
                      <TableRow key={face.id}>
                        <TableCell className="font-medium">{face.asset.code}</TableCell>
                        <TableCell className="text-muted-foreground">{face.code}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {face.position?.name ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {String(face.width)} m x {String(face.height)} m
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {facingLabels[face.facing] ?? face.facing}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {statusLabels[face.status as FaceStatus] ?? face.status}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Acciones para la cara ${face.code}`}
                              >
                                {isUpdating ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              <DropdownMenuLabel>{face.code}</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/inventory/faces/${face.id}/edit`}>
                                  <Pencil className="h-4 w-4" />
                                  Editar cara
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  void handleCopyCode(face.code, "Código de cara");
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                Copiar código de cara
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault();
                                  void handleCopyCode(face.asset.code, "Código de activo");
                                }}
                              >
                                <Copy className="h-4 w-4" />
                                Copiar código de activo
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/inventory/faces/new?assetId=${face.asset.id}`}>
                                  Nueva cara en activo
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
                              {statusOptions.map((option) => (
                                <DropdownMenuItem
                                  key={`${face.id}-${option}`}
                                  disabled={isUpdating || option === face.status}
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    changeFaceStatus(face.id, face.code, option);
                                  }}
                                >
                                  {statusLabels[option]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                : null}
            </TableBody>
          </Table>

          {!facesQuery.error && total > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => Math.max(0, previous - 1))}
                  disabled={!hasPrevious || facesQuery.isFetching}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((previous) => previous + 1)}
                  disabled={!hasMore || facesQuery.isFetching}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
