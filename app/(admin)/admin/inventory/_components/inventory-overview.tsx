import Link from "next/link";
import { AlertTriangle, Boxes, Layers, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createServerTRPCCaller } from "@/lib/trpc/server";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;
type InventoryStatus = (typeof statusOptions)[number];

const statusLabels: Record<InventoryStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  MAINTENANCE: "Mantenimiento",
  RETIRED: "Retirado",
};

const statusBadgeVariant: Record<
  InventoryStatus,
  "success" | "secondary" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  INACTIVE: "secondary",
  MAINTENANCE: "warning",
  RETIRED: "destructive",
};

const statusBarClass: Record<InventoryStatus, string> = {
  ACTIVE: "bg-emerald-500",
  INACTIVE: "bg-slate-400",
  MAINTENANCE: "bg-amber-500",
  RETIRED: "bg-red-500",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-PA").format(value);
}

function formatRelativeDate(date: Date) {
  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export async function InventoryOverview() {
  const caller = await createServerTRPCCaller();
  const {
    totalAssets,
    totalFaces,
    digitalAssets,
    illuminatedAssets,
    assetsWithoutFaces,
    assetsByStatus,
    facesByStatus,
    latestAssets,
    latestFaces,
  } = await caller.inventory.overview();

  const maintenanceAssets = assetsByStatus.MAINTENANCE;
  const maintenanceFaces = facesByStatus.MAINTENANCE;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de activos</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(totalAssets)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Estructuras registradas en inventario.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de caras</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(totalFaces)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Superficies vendibles configuradas.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activos digitales</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(digitalAssets)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Inventario con capacidad digital.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activos iluminados</CardDescription>
            <CardTitle className="text-2xl">{formatNumber(illuminatedAssets)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Estructuras con iluminación activa.
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Estado operativo</CardTitle>
            <CardDescription>Distribución de activos y caras por estado.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                Activos
              </div>
              {statusOptions.map((status) => {
                const count = assetsByStatus[status];
                const percentage =
                  totalAssets > 0 ? Math.round((count / totalAssets) * 100) : 0;
                return (
                  <div key={`assets-${status}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{statusLabels[status]}</span>
                      <span className="font-medium text-foreground">
                        {formatNumber(count)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${statusBarClass[status]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Layers className="h-4 w-4 text-muted-foreground" />
                Caras
              </div>
              {statusOptions.map((status) => {
                const count = facesByStatus[status];
                const percentage =
                  totalFaces > 0 ? Math.round((count / totalFaces) * 100) : 0;
                return (
                  <div key={`faces-${status}`} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{statusLabels[status]}</span>
                      <span className="font-medium text-foreground">
                        {formatNumber(count)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${statusBarClass[status]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atención</CardTitle>
            <CardDescription>Elementos que conviene revisar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Activos sin caras
                </div>
                <Badge variant={assetsWithoutFaces > 0 ? "warning" : "success"}>
                  {formatNumber(assetsWithoutFaces)}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Activos que aún no tienen superficies vendibles asociadas.
              </p>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  En mantenimiento
                </div>
                <Badge variant="info">
                  {formatNumber(maintenanceAssets + maintenanceFaces)}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatNumber(maintenanceAssets)} activos y {formatNumber(maintenanceFaces)}{" "}
                caras con estado de mantenimiento.
              </p>
            </div>

            <Link
              href="/admin/inventory/assets/new"
              className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
            >
              Registrar nuevo activo
            </Link>
            <Link
              href="/admin/inventory/faces/new"
              className="block rounded-lg border p-3 text-sm transition-colors hover:bg-muted/40"
            >
              Registrar nueva cara
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Últimos activos</CardTitle>
            <CardDescription>Registros creados recientemente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestAssets.length ? (
              latestAssets.map((asset) => (
                <Link
                  key={asset.id}
                  href={`/admin/inventory/assets/${asset.id}/edit`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium text-foreground">{asset.code}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(asset.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant[asset.status as InventoryStatus]}>
                    {statusLabels[asset.status as InventoryStatus]}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay activos registrados.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimas caras</CardTitle>
            <CardDescription>Últimos registros de caras.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {latestFaces.length ? (
              latestFaces.map((face) => (
                <Link
                  key={face.id}
                  href={`/admin/inventory/faces/${face.id}/edit`}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {face.asset.code} - {face.code}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant[face.status as InventoryStatus]}>
                    {statusLabels[face.status as InventoryStatus]}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Aún no hay caras registradas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
