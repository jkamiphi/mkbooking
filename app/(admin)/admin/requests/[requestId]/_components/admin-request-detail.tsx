"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  FileText,
  MapPin,
  MessageSquareText,
  PackageSearch,
  Search,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const GOOGLE_MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "";
const DEFAULT_MAP_CENTER = { lat: 8.9824, lng: -79.5199 };

const statusOptions = [
  "NEW",
  "IN_REVIEW",
  "QUOTATION_GENERATED",
  "PROPOSAL_SENT",
  "CONFIRMED",
  "REJECTED",
] as const;

function statusLabel(status: string) {
  if (status === "NEW") return "Nueva";
  if (status === "IN_REVIEW") return "En revisión";
  if (status === "QUOTATION_GENERATED") return "Cotización generada";
  if (status === "PROPOSAL_SENT") return "Propuesta enviada";
  if (status === "CONFIRMED") return "Confirmada";
  if (status === "REJECTED") return "Rechazada";
  return status;
}

function statusBadgeVariant(status: string) {
  if (status === "NEW") return "info" as const;
  if (status === "IN_REVIEW") return "warning" as const;
  if (status === "QUOTATION_GENERATED") return "warning" as const;
  if (status === "PROPOSAL_SENT") return "secondary" as const;
  if (status === "CONFIRMED") return "success" as const;
  return "destructive" as const;
}

function formatCurrency(value: string | number, currency = "USD") {
  return new Intl.NumberFormat("es-PA", {
    style: "currency",
    currency,
  }).format(Number(value));
}

type SuggestionFace = {
  id: string;
  code: string;
  assetCode: string;
  title: string;
  zone: string;
  province: string;
  structureType: string;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  matchesCriteria: boolean;
  isAssigned: boolean;
};

export function AdminRequestDetail({ requestId }: { requestId: string }) {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [statusDraft, setStatusDraft] = useState<string | undefined>(undefined);
  const [assignedFaceIds, setAssignedFaceIds] = useState<string[] | undefined>(
    undefined,
  );
  const [searchText, setSearchText] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string | undefined>(undefined);
  const [structureTypeFilter, setStructureTypeFilter] = useState<
    string | undefined
  >(undefined);
  const [includeOutsideCriteria, setIncludeOutsideCriteria] = useState(true);
  const [focusedFaceId, setFocusedFaceId] = useState<string | null>(null);

  const { data: request, isLoading } = trpc.catalog.requests.get.useQuery(
    { requestId },
    { refetchOnWindowFocus: false },
  );

  const effectiveStatusDraft = statusDraft ?? request?.status ?? "IN_REVIEW";
  const effectiveAssignedFaceIds =
    assignedFaceIds ??
    request?.assignments.map((assignment) => assignment.faceId) ??
    [];
  const effectiveZoneFilter = zoneFilter ?? request?.zoneId ?? "";
  const effectiveStructureTypeFilter =
    structureTypeFilter ?? request?.structureTypeId ?? "";

  const { data: zones } = trpc.inventory.zones.publicList.useQuery(undefined, {
    enabled: Boolean(request),
    refetchOnWindowFocus: false,
  });

  const { data: structureTypes } =
    trpc.inventory.structureTypes.publicList.useQuery(undefined, {
      enabled: Boolean(request),
      refetchOnWindowFocus: false,
    });

  const suggestionsInput = useMemo(
    () => ({
      requestId,
      includeOutsideCriteria,
      search: searchText.trim() || undefined,
      zoneId: effectiveZoneFilter || undefined,
      structureTypeId: effectiveStructureTypeFilter || undefined,
      skip: 0,
      take: 150,
    }),
    [
      requestId,
      includeOutsideCriteria,
      searchText,
      effectiveZoneFilter,
      effectiveStructureTypeFilter,
    ],
  );

  const { data: suggestions, isLoading: isSuggestionsLoading } =
    trpc.catalog.requests.suggestFaces.useQuery(suggestionsInput, {
      enabled: Boolean(request),
      refetchOnWindowFocus: false,
    });

  const updateStatus = trpc.catalog.requests.updateStatus.useMutation({
    onSuccess: () => {
      void utils.catalog.requests.get.invalidate({ requestId });
      toast.success("Estado actualizado exitosamente");
    },
    onError: (error) => {
      toast.error("No se pudo actualizar el estado", {
        description: error.message,
      });
    },
  });

  const assignFaces = trpc.catalog.requests.assignFaces.useMutation({
    onSuccess: (result) => {
      void utils.catalog.requests.get.invalidate({ requestId });
      const description = `Asignadas ${result.assignedCount} / ${result.requestedCount} caras.`;
      toast.success("Asignaciones guardadas", { description });

      if (result.outsideCriteriaCount > 0) {
        toast("Advertencia", {
          description: `${result.outsideCriteriaCount} cara(s) asignadas fuera del criterio inicial.`,
        });
      }

      if (result.salesReviewReopenedForOrder) {
        toast("Revisión comercial reabierta", {
          description: `La orden ${result.salesReviewReopenedForOrder.orderCode} volvió a revisión de Ventas.`,
        });
      }
    },
    onError: (error) => {
      toast.error("No se pudieron guardar las asignaciones", {
        description: error.message,
      });
    },
  });

  const generateOrder = trpc.orders.generateFromRequest.useMutation({
    onSuccess: (result) => {
      void utils.catalog.requests.get.invalidate({ requestId });

      const warningMessages: string[] = [];
      if (result.warnings.partialAssignment) {
        warningMessages.push(
          `Asignación parcial: ${result.warnings.assignedCount}/${result.warnings.requestedCount}`,
        );
      }
      if (result.warnings.outsideCriteriaCount > 0) {
        warningMessages.push(
          `${result.warnings.outsideCriteriaCount} cara(s) fuera de criterio`,
        );
      }

      toast.success("Cotización generada", {
        description:
          warningMessages.length > 0
            ? `${result.order.code}. ${warningMessages.join(" · ")}`
            : `Se creó el borrador ${result.order.code}.`,
      });

      router.push(`/admin/orders/${result.order.id}`);
    },
    onError: (error) => {
      toast.error("Error al generar cotización", {
        description: error.message,
      });
    },
  });

  const confirmRequest = trpc.catalog.requests.confirm.useMutation({
    onSuccess: (result) => {
      void utils.catalog.requests.list.invalidate();
      void utils.catalog.holds.list.invalidate();
      toast.success("Solicitud confirmada", {
        description: `Holds creados: ${result.createdHolds}. Omitidos por hold activo: ${result.skippedActiveHolds}.`,
      });
    },
    onError: (error) => {
      toast.error("No se pudo confirmar la solicitud", {
        description: error.message,
      });
    },
  });

  function toggleFace(faceId: string, checked: boolean) {
    if (!request) return;

    if (checked) {
      setAssignedFaceIds((prevState) => {
        const prev = prevState ?? effectiveAssignedFaceIds;
        if (prev.includes(faceId)) return prev;

        if (prev.length >= request.quantity) {
          toast.error("Límite alcanzado", {
            description: `Solo puedes asignar hasta ${request.quantity} cara(s).`,
          });
          return prev;
        }

        return [...prev, faceId];
      });
      return;
    }

    setAssignedFaceIds((prevState) => {
      const prev = prevState ?? effectiveAssignedFaceIds;
      return prev.filter((id) => id !== faceId);
    });
  }

  function handleSaveAssignments() {
    assignFaces.mutate({
      requestId,
      faceIds: effectiveAssignedFaceIds,
    });
  }

  if (isLoading) {
    return (
      <AdminPageShell>
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-md border-2 border-neutral-300 border-t-[#0359A8]" />
        </div>
      </AdminPageShell>
    );
  }

  if (!request) {
    return (
      <AdminPageShell>
        <div className="flex h-[400px] flex-col items-center justify-center text-center">
          <PackageSearch className="mb-4 h-10 w-10 text-neutral-300" />
          <h3 className="text-lg font-semibold text-neutral-900">
            Solicitud no encontrada
          </h3>
          <p className="mt-2 max-w-md text-sm text-neutral-500">
            La solicitud {requestId} no existe o no tienes permisos para verla.
          </p>
          <Button variant="outline" className="mt-6" asChild>
            <Link href="/admin/requests">Volver a Solicitudes</Link>
          </Button>
        </div>
      </AdminPageShell>
    );
  }

  const assignedCount = effectiveAssignedFaceIds.length;
  const requestedCount = request.quantity;
  const partialAssignment = assignedCount < requestedCount;
  const suggestionList = (suggestions ?? []) as SuggestionFace[];
  const effectiveFocusedFaceId =
    focusedFaceId && suggestionList.some((face) => face.id === focusedFaceId)
      ? focusedFaceId
      : null;

  const markerFaces = suggestionList.filter(
    (face) =>
      typeof face.latitude === "number" && typeof face.longitude === "number",
  );

  const mapCenter = markerFaces.length
    ? {
        lat: markerFaces[0].latitude as number,
        lng: markerFaces[0].longitude as number,
      }
    : DEFAULT_MAP_CENTER;

  const outsideSelectedCount = suggestionList.filter(
    (face) =>
      effectiveAssignedFaceIds.includes(face.id) && !face.matchesCriteria,
  ).length;

  const servicesSubtotal = request.services.reduce(
    (sum, serviceItem) => sum + Number(serviceItem.subtotal),
    0,
  );

  const canGenerateQuotation =
    request.status === "IN_REVIEW" &&
    (effectiveAssignedFaceIds.length > 0 || request.services.length > 0);

  return (
    <AdminPageShell>
      <div className="mb-4">
        <Link
          href="/admin/requests"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Regresar a Solicitudes
        </Link>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <AdminPageHeader
          title={`Solicitud ${request.id.slice(0, 8).toUpperCase()}`}
          description={`Creada el ${format(
            new Date(request.createdAt),
            "dd 'de' MMMM, yyyy",
            {
              locale: es,
            },
          )}`}
        />
        <div className="-mt-4 mb-4 md:mt-0 md:ml-4">
          <Badge variant={statusBadgeVariant(request.status)}>
            {statusLabel(request.status)}
          </Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-1">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900">
                Detalles de Contacto
              </h3>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {request.createdBy?.user?.name || "Usuario Anónimo"}
                </p>
                <p className="text-xs text-neutral-500">
                  {request.createdBy?.user?.email || request.contactEmail}
                </p>
              </div>

              <h3 className="mt-6 border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900">
                Requerimiento
              </h3>
              <ul className="space-y-2 text-sm text-neutral-700">
                <li className="flex justify-between gap-3">
                  <span className="text-neutral-500">Cantidad objetivo:</span>
                  <span className="font-medium text-neutral-900">
                    {request.quantity} cara{request.quantity === 1 ? "" : "s"}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-neutral-500">Tipo:</span>
                  <span className="text-right font-medium text-neutral-900">
                    {request.structureType?.name || "Cualquier tipo"}
                  </span>
                </li>
                <li className="flex justify-between gap-3">
                  <span className="text-neutral-500">Zona:</span>
                  <span className="text-right font-medium text-neutral-900">
                    {request.zone
                      ? `${request.zone.name}, ${request.zone.province.name}`
                      : "Cualquier zona"}
                  </span>
                </li>
              </ul>

              {request.notes && (
                <div className="mt-4 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                    <MessageSquareText className="h-3.5 w-3.5" />
                    Notas del usuario
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-neutral-700">
                    {request.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900">
                Servicios solicitados
              </h3>

              {request.services.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  Sin servicios adicionales.
                </p>
              ) : (
                <div className="space-y-2">
                  {request.services.map((serviceItem) => (
                    <div
                      key={serviceItem.id}
                      className="rounded-xl border border-neutral-200 p-3"
                    >
                      <p className="text-sm font-medium text-neutral-900">
                        {serviceItem.service?.name || "Servicio adicional"}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {serviceItem.quantity} x{" "}
                        {formatCurrency(
                          Number(serviceItem.unitPrice),
                          serviceItem.service?.currency || "USD",
                        )}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900">
                        {formatCurrency(
                          Number(serviceItem.subtotal),
                          serviceItem.service?.currency || "USD",
                        )}
                      </p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                    <span className="text-neutral-600">Total servicios</span>
                    <span className="font-semibold text-neutral-900">
                      {formatCurrency(servicesSubtotal)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <h3 className="border-b border-neutral-100 pb-2 text-sm font-semibold text-neutral-900">
                Acciones Administrativas
              </h3>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <SelectNative
                    className="flex-1"
                    value={effectiveStatusDraft}
                    onChange={(event) => setStatusDraft(event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </SelectNative>
                  <Button
                    variant="outline"
                    onClick={() =>
                      updateStatus.mutate({
                        requestId,
                        status: effectiveStatusDraft as never,
                      })
                    }
                    disabled={
                      updateStatus.isPending ||
                      effectiveStatusDraft === request.status
                    }
                  >
                    Actualizar
                  </Button>
                </div>

                <div className="border-t border-neutral-100 pt-4">
                  {partialAssignment && request.status === "IN_REVIEW" && (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                        <span>
                          Se cotizará con asignación parcial ({assignedCount}/
                          {requestedCount}).
                        </span>
                      </div>
                    </div>
                  )}

                  {request.status === "IN_REVIEW" && canGenerateQuotation && (
                    <Button
                      className="w-full bg-[#0359A8]"
                      onClick={() => generateOrder.mutate({ requestId })}
                      disabled={generateOrder.isPending}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generar Cotización (Orden)
                    </Button>
                  )}

                  {request.status === "QUOTATION_GENERATED" &&
                    request.order && (
                      <Button asChild className="mt-2 w-full" variant="outline">
                        <Link href={`/admin/orders/${request.order.id}`}>
                          Revisar Cotización Generada
                        </Link>
                      </Button>
                    )}

                  <Button
                    variant="secondary"
                    className="mt-2 w-full"
                    onClick={() => confirmRequest.mutate({ requestId })}
                    disabled={
                      confirmRequest.isPending ||
                      effectiveAssignedFaceIds.length === 0
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar Directamente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    Asignación de caras con mapa
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    Asignadas {assignedCount} / Solicitadas {requestedCount}
                  </p>
                  {outsideSelectedCount > 0 && (
                    <p className="mt-1 text-xs text-amber-700">
                      {outsideSelectedCount} cara(s) asignadas fuera de
                      criterio.
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveAssignments}
                  disabled={assignFaces.isPending || isSuggestionsLoading}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                  Guardar asignaciones
                </Button>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="relative lg:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <Input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Buscar por título/código"
                    className="pl-9"
                  />
                </div>

                <SelectNative
                  value={effectiveZoneFilter}
                  onChange={(event) => setZoneFilter(event.target.value)}
                >
                  <option value="">Todas las zonas</option>
                  {(zones ?? []).map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}, {zone.province.name}
                    </option>
                  ))}
                </SelectNative>

                <SelectNative
                  value={effectiveStructureTypeFilter}
                  onChange={(event) =>
                    setStructureTypeFilter(event.target.value)
                  }
                >
                  <option value="">Todos los tipos</option>
                  {(structureTypes ?? []).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <label className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={includeOutsideCriteria}
                  onChange={(event) =>
                    setIncludeOutsideCriteria(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-neutral-300 text-[#0359A8]"
                />
                Incluir sugerencias fuera de criterio
              </label>

              {isSuggestionsLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-md border-2 border-neutral-300 border-t-[#0359A8]" />
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-neutral-200">
                    {GOOGLE_MAPS_API_KEY ? (
                      <div className="h-[420px] w-full">
                        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                          <Map
                            defaultCenter={mapCenter}
                            defaultZoom={11}
                            mapId={GOOGLE_MAP_ID}
                            gestureHandling="greedy"
                            disableDefaultUI={false}
                            zoomControl={true}
                            mapTypeControl={false}
                            streetViewControl={false}
                            className="h-full w-full"
                          >
                            {markerFaces.map((face) => {
                              const isAssigned =
                                effectiveAssignedFaceIds.includes(face.id);
                              const isFocused =
                                effectiveFocusedFaceId === face.id;
                              const markerColor = isAssigned
                                ? "bg-emerald-600"
                                : face.matchesCriteria
                                  ? "bg-[#0359A8]"
                                  : "bg-amber-500";

                              return (
                                <AdvancedMarker
                                  key={face.id}
                                  position={{
                                    lat: face.latitude as number,
                                    lng: face.longitude as number,
                                  }}
                                  onClick={() => {
                                    setFocusedFaceId(face.id);
                                    toggleFace(face.id, !isAssigned);
                                  }}
                                >
                                  <div
                                    className={`h-4 w-4 rounded-md border-2 border-white ${markerColor} ${isFocused ? "ring-4 ring-neutral-300" : ""}`}
                                  />
                                </AdvancedMarker>
                              );
                            })}
                          </Map>
                        </APIProvider>
                      </div>
                    ) : (
                      <div className="flex h-[420px] items-center justify-center bg-neutral-100 p-4 text-center text-sm text-neutral-500">
                        Configura `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para
                        habilitar el mapa.
                      </div>
                    )}
                  </div>

                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                    {suggestionList.map((face) => {
                      const isChecked = effectiveAssignedFaceIds.includes(
                        face.id,
                      );
                      const isFocused = effectiveFocusedFaceId === face.id;

                      return (
                        <div
                          key={face.id}
                          onClick={() => setFocusedFaceId(face.id)}
                          className={`cursor-pointer rounded-xl border p-3 transition ${
                            isFocused
                              ? "border-[#0359A8] bg-[#0359A8]/5"
                              : isChecked
                                ? "border-emerald-300 bg-emerald-50"
                                : "border-neutral-200 bg-white hover:border-neutral-300"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(value) =>
                                toggleFace(face.id, Boolean(value))
                              }
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-neutral-900">
                                {face.title}
                              </p>
                              <p className="mt-1 text-xs text-neutral-500">
                                {face.assetCode} · Cara {face.code}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500">
                                <MapPin className="h-3 w-3" />
                                {face.zone}, {face.province}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="secondary">
                                  {face.structureType}
                                </Badge>
                                {!face.matchesCriteria && (
                                  <Badge variant="warning">
                                    Fuera de criterio
                                  </Badge>
                                )}
                                {isChecked && (
                                  <Badge variant="success">Asignada</Badge>
                                )}
                                {(face.latitude === null ||
                                  face.longitude === null) && (
                                  <Badge variant="secondary">
                                    Sin coordenadas
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {suggestionList.length === 0 && (
                      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                        No hay sugerencias con los filtros actuales.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageShell>
  );
}
