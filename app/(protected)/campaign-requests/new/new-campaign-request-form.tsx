"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ListFilter, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { CampaignDateRangePicker } from "@/components/campaign/campaign-date-range-picker";
import {
  calculateDateDifferenceInDays,
  clampDate,
  isRangeValid,
  parseDateInputValue,
  sanitizeDateRangeStrings,
  toDateInputValue,
} from "@/lib/date/campaign-date-range";
import { trpc } from "@/lib/trpc/client";
import { useFaceSelection } from "@/components/face-selection-context";

type StructureTypeOption = {
  id: string;
  name: string;
};

type ZoneOption = {
  id: string;
  name: string;
  province: { name: string };
};

type SelectedFaceData = {
  id: string;
  title: string;
  location: string;
  imageUrl: string | null;
  priceLabel: string | null;
  priceDaily: number | null;
  currency: string;
  structureType: string;
};

type SelectedServiceState = {
  quantity: string;
  notes: string;
};

type NewCampaignRequestFormProps = {
  query?: string;
  defaultStructureTypeId?: string;
  defaultZoneId?: string;
  defaultQuantity: number;
  defaultFromDate?: string;
  defaultToDate?: string;
  defaultContactName?: string;
  defaultContactEmail?: string;
  defaultContactPhone?: string;
  minimumStartDate: string;
  minimumDurationDays: number;
  returnTo: string;
  structureTypes: StructureTypeOption[];
  zones: ZoneOption[];
  selectedFaces?: SelectedFaceData[];
};

function formatCurrency(value: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

export function NewCampaignRequestForm({
  query,
  defaultStructureTypeId,
  defaultZoneId,
  defaultQuantity,
  defaultFromDate,
  defaultToDate,
  defaultContactName,
  defaultContactEmail,
  defaultContactPhone,
  minimumStartDate,
  minimumDurationDays,
  returnTo,
  structureTypes,
  zones,
  selectedFaces: initialSelectedFaces,
}: NewCampaignRequestFormProps) {
  const router = useRouter();
  const { clearSelection } = useFaceSelection();

  const [faces, setFaces] = useState<SelectedFaceData[]>(
    initialSelectedFaces ?? [],
  );
  const hasFaces = faces.length > 0;

  const [structureTypeId, setStructureTypeId] = useState(
    defaultStructureTypeId ?? "",
  );
  const [zoneId, setZoneId] = useState(defaultZoneId ?? "");
  const [quantity, setQuantity] = useState(String(defaultQuantity));
  const [fromDate, setFromDate] = useState(defaultFromDate ?? "");
  const [toDate, setToDate] = useState(defaultToDate ?? "");
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState(defaultContactName ?? "");
  const [contactEmail, setContactEmail] = useState(defaultContactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(defaultContactPhone ?? "");
  const [selectedServices, setSelectedServices] = useState<
    Record<string, SelectedServiceState>
  >({});
  const minimumStartDateValue =
    parseDateInputValue(minimumStartDate) ?? clampDate(new Date());
  const parsedFromDate = parseDateInputValue(fromDate);
  const parsedToDate = parseDateInputValue(toDate);
  const hasValidDateRange = isRangeValid({
    fromDate: parsedFromDate,
    toDate: parsedToDate,
    minimumStartDate: minimumStartDateValue,
    minimumDurationDays,
  });

  const sectionClassName =
    "rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl";
  const controlClassName =
    "h-11 rounded-2xl border-neutral-200 bg-white px-4 shadow-none transition focus-visible:border-[#0359A8] focus-visible:ring-2 focus-visible:ring-[#0359A8]/20";
  const textareaClassName =
    "min-h-24 rounded-2xl border-neutral-200 bg-white px-4 py-3 shadow-none transition focus-visible:border-[#0359A8] focus-visible:ring-2 focus-visible:ring-[#0359A8]/20";

  const trpcUtils = trpc.useUtils();
  const [isValidating, setIsValidating] = useState(false);
  const { data: availableServices, isLoading: isServicesLoading } =
    trpc.catalog.services.publicList.useQuery();

  const pricedFaces = faces.filter(
    (f) => f.priceDaily !== null && f.priceDaily > 0,
  );
  const rentalCurrency = pricedFaces[0]?.currency ?? "USD";
  const rentalDailyTotal = pricedFaces.reduce(
    (sum, face) => sum + (face.priceDaily ?? 0),
    0,
  );
  const estimatedDays = (() => {
    if (!parsedFromDate || !parsedToDate) {
      return null;
    }

    return calculateDateDifferenceInDays(parsedFromDate, parsedToDate) + 1;
  })();
  const rentalEstimatedSubtotal =
    estimatedDays !== null
      ? rentalDailyTotal * estimatedDays
      : rentalDailyTotal;

  const selectedServiceRows = (availableServices ?? [])
    .filter((service) => Boolean(selectedServices[service.id]))
    .map((service) => {
      const quantity = Number(selectedServices[service.id]?.quantity || "1");
      const normalizedQuantity =
        Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
      const unitPrice = Number(service.basePrice);
      return {
        serviceId: service.id,
        name: service.name,
        quantity: normalizedQuantity,
        unitPrice,
        subtotal: normalizedQuantity * unitPrice,
        notes: selectedServices[service.id]?.notes?.trim() || undefined,
      };
    });
  const servicesSubtotal = selectedServiceRows.reduce(
    (sum, service) => sum + service.subtotal,
    0,
  );
  const combinedSubtotal = rentalEstimatedSubtotal + servicesSubtotal;
  const combinedTax = combinedSubtotal * 0.07;
  const combinedTotal = combinedSubtotal + combinedTax;

  const createRequestMutation = trpc.catalog.requests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitud enviada", {
        description: hasFaces
          ? `Cotización de ${faces.length} ${faces.length === 1 ? "cara" : "caras"} enviada al equipo comercial.`
          : "El equipo comercial revisará tu campaña desde admin.",
      });
      clearSelection();
      router.push(returnTo);
      router.refresh();
    },
    onError: (error) => {
      toast.error("No se pudo enviar la solicitud", {
        description: error.message,
      });
    },
  });

  function removeFaceFromForm(faceId: string) {
    setFaces((prev) => {
      const updated = prev.filter((f) => f.id !== faceId);
      setQuantity(String(updated.length > 0 ? updated.length : 1));
      return updated;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const sanitizedDateRange = sanitizeDateRangeStrings({
      fromDate,
      toDate,
      minimumStartDate: minimumStartDateValue,
      minimumDurationDays,
      mode: "drop-invalid",
    });

    if (!sanitizedDateRange.fromDate || !sanitizedDateRange.toDate) {
      toast.error("Rango de fechas inválido", {
        description: `Selecciona fechas válidas a partir de ${toDateInputValue(
          minimumStartDateValue,
        )} y con al menos ${minimumDurationDays} día de diferencia.`,
      });
      return;
    }

    const parsedQuantity = hasFaces ? faces.length : Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      toast.error("Cantidad inválida", {
        description: "Debes solicitar al menos 1 cara.",
      });
      return;
    }

    // --- Final availability revalidation ---
    if (hasFaces) {
      setIsValidating(true);
      try {
        const result = await trpcUtils.catalog.faces.checkAvailability.fetch({
          faceIds: faces.map((f) => f.id),
          fromDate: new Date(`${sanitizedDateRange.fromDate}T00:00:00`),
          toDate: new Date(`${sanitizedDateRange.toDate}T00:00:00`),
        });

        if (result.unavailable.length > 0) {
          const unavailableIds = new Set(
            result.unavailable.map((u) => u.faceId),
          );
          setFaces((prev) => {
            const updated = prev.filter((f) => !unavailableIds.has(f.id));
            setQuantity(String(updated.length > 0 ? updated.length : 1));
            return updated;
          });

          const details = result.unavailable
            .map((u) => `• ${u.title}: ${u.reason}`)
            .join("\n");

          toast.error("Algunas caras ya no están disponibles", {
            description: details,
            duration: 8000,
          });
          return;
        }
      } catch {
        toast.error("Error al validar disponibilidad", {
          description:
            "No se pudo verificar la disponibilidad. Intenta de nuevo.",
        });
        return;
      } finally {
        setIsValidating(false);
      }
    }

    createRequestMutation.mutate({
      query: query || undefined,
      structureTypeId: structureTypeId || undefined,
      zoneId: zoneId || undefined,
      quantity: parsedQuantity,
      fromDate: sanitizedDateRange.fromDate,
      toDate: sanitizedDateRange.toDate,
      notes: notes.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      selectedFaceIds: hasFaces ? faces.map((f) => f.id) : undefined,
      selectedServices: selectedServiceRows.map((service) => ({
        serviceId: service.serviceId,
        quantity: service.quantity,
        notes: service.notes,
      })),
    });
  }

  function toggleService(serviceId: string, checked: boolean) {
    setSelectedServices((prev) => {
      if (!checked) {
        const next = { ...prev };
        delete next[serviceId];
        return next;
      }

      return {
        ...prev,
        [serviceId]: prev[serviceId] ?? { quantity: "1", notes: "" },
      };
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selected faces section */}
      {hasFaces && (
        <section className={sectionClassName}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-900">
              Caras seleccionadas ({faces.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setFaces([]);
                setQuantity("1");
              }}
              className="text-xs font-medium text-neutral-500 transition hover:text-neutral-700"
            >
              Limpiar todo
            </button>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            Estas caras específicas serán incluidas en tu solicitud de
            cotización.
          </p>

          {/* Price estimation */}
          {(() => {
            const pricedFaces = faces.filter(
              (f) => f.priceDaily !== null && f.priceDaily > 0,
            );
            if (pricedFaces.length === 0) return null;

            const dailyTotal = pricedFaces.reduce(
              (sum, f) => sum + (f.priceDaily ?? 0),
              0,
            );
            const currency = pricedFaces[0]?.currency ?? "USD";

            const periodDays = estimatedDays;

            const fmt = (v: number) => {
              try {
                return new Intl.NumberFormat("es-PA", {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 0,
                }).format(v);
              } catch {
                return `$${v.toFixed(0)}`;
              }
            };

            return (
              <div className="mt-4 rounded-2xl border border-[#0359A8]/20 bg-[#0359A8]/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#0359A8]/70">
                  Estimación
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  <div>
                    <span className="text-2xl font-bold text-neutral-900">
                      {fmt(dailyTotal)}
                    </span>
                    <span className="ml-1 text-sm text-neutral-500">/día</span>
                  </div>
                  {periodDays !== null && (
                    <div>
                      <span className="text-lg font-semibold text-neutral-900">
                        {fmt(dailyTotal * periodDays)}
                      </span>
                      <span className="ml-1 text-sm text-neutral-500">
                        total · {periodDays} {periodDays === 1 ? "día" : "días"}
                      </span>
                    </div>
                  )}
                </div>
                {pricedFaces.length < faces.length && (
                  <p className="mt-2 text-xs text-neutral-500">
                    * {faces.length - pricedFaces.length}{" "}
                    {faces.length - pricedFaces.length === 1 ? "cara" : "caras"}{" "}
                    sin precio configurado.
                  </p>
                )}
              </div>
            );
          })()}

          <div className="mt-4 space-y-2">
            {faces.map((face) => (
              <div
                key={face.id}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 transition hover:border-neutral-300"
              >
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {face.imageUrl ? (
                    <Image
                      src={face.imageUrl}
                      alt={face.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-[#fcb814]/20 to-[#0359A8]/20">
                      <span className="text-[8px] font-semibold text-neutral-500">
                        {face.structureType}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {face.title}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {face.location}
                    {face.priceLabel ? ` · ${face.priceLabel}/día` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFaceFromForm(face.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
                  aria-label={`Quitar ${face.title}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className={sectionClassName}>
        <h2 className="text-lg font-semibold text-neutral-900">
          Configuración de campaña
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          {hasFaces
            ? "Los detalles de tipo, zona y cantidad se derivarán de las caras seleccionadas."
            : "Define tipo, zona, cantidad y rango de fechas para solicitar asignación de caras."}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {!hasFaces && (
            <>
              <div className="space-y-1.5">
                <Label
                  htmlFor="request-structure-type"
                  className="text-neutral-700"
                >
                  Tipo de estructura
                </Label>
                <SelectNative
                  id="request-structure-type"
                  value={structureTypeId}
                  onChange={(event) => setStructureTypeId(event.target.value)}
                  className={controlClassName}
                >
                  <option value="">Cualquier tipo</option>
                  {structureTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="request-zone" className="text-neutral-700">
                  Zona
                </Label>
                <SelectNative
                  id="request-zone"
                  value={zoneId}
                  onChange={(event) => setZoneId(event.target.value)}
                  className={controlClassName}
                >
                  <option value="">Todas las zonas</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}, {zone.province.name}
                    </option>
                  ))}
                </SelectNative>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="request-quantity" className="text-neutral-700">
                  Cantidad de caras
                </Label>
                <Input
                  id="request-quantity"
                  type="number"
                  min={1}
                  max={500}
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className={controlClassName}
                />
                <p className="text-xs text-neutral-500">
                  Mínimo 1, máximo 500.
                </p>
              </div>
            </>
          )}

          {hasFaces && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-neutral-700">Cantidad de caras</Label>
              <p className="text-sm font-semibold text-neutral-900">
                {faces.length}{" "}
                {faces.length === 1
                  ? "cara seleccionada"
                  : "caras seleccionadas"}
              </p>
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <Label htmlFor="request-from" className="text-neutral-700">
                Desde
              </Label>
              <Label htmlFor="request-to" className="text-neutral-700">
                Hasta
              </Label>
            </div>
            <CampaignDateRangePicker
              variant="inputs"
              fromDate={fromDate || undefined}
              toDate={toDate || undefined}
              minimumStartDate={toDateInputValue(minimumStartDateValue)}
              minimumDurationDays={minimumDurationDays}
              fromInputId="request-from"
              toInputId="request-to"
              inputClassName={controlClassName}
              onChange={(nextFromDate, nextToDate) => {
                setFromDate(nextFromDate ?? "");
                setToDate(nextToDate ?? "");
              }}
            />
            <p className="text-xs text-neutral-500">
              Inicio disponible desde {toDateInputValue(minimumStartDateValue)}.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="request-notes" className="text-neutral-700">
            Notas
          </Label>
          <Textarea
            id="request-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Objetivo de campaña, ubicaciones preferidas, restricciones, etc."
            className={textareaClassName}
          />
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className="text-lg font-semibold text-neutral-900">
          Servicios adicionales
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Selecciona servicios facturables adicionales para esta campaña.
        </p>

        {isServicesLoading ? (
          <div className="mt-4 text-sm text-neutral-500">
            Cargando servicios...
          </div>
        ) : !availableServices || availableServices.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
            No hay servicios adicionales activos por ahora.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {availableServices.map((service) => {
              const serviceState = selectedServices[service.id];
              const isSelected = Boolean(serviceState);
              const quantity = Number(serviceState?.quantity || "1");
              const normalizedQuantity =
                Number.isFinite(quantity) && quantity > 0
                  ? Math.floor(quantity)
                  : 1;
              const unitPrice = Number(service.basePrice);
              const subtotal = normalizedQuantity * unitPrice;

              return (
                <div
                  key={service.id}
                  className={`rounded-2xl border p-4 transition ${
                    isSelected
                      ? "border-[#0359A8]/40 bg-[#0359A8]/5"
                      : "border-neutral-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(event) =>
                          toggleService(service.id, event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]"
                      />
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {service.name}
                        </p>
                        {service.description && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {service.description}
                          </p>
                        )}
                      </div>
                    </label>
                    <div className="text-right text-sm font-semibold text-neutral-900">
                      {formatCurrency(unitPrice, service.currency)}
                    </div>
                  </div>

                  {isSelected && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-neutral-600">
                          Cantidad
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          value={serviceState?.quantity ?? "1"}
                          onChange={(event) =>
                            setSelectedServices((prev) => ({
                              ...prev,
                              [service.id]: {
                                quantity: event.target.value,
                                notes: prev[service.id]?.notes ?? "",
                              },
                            }))
                          }
                          className={controlClassName}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs text-neutral-600">
                          Nota del servicio (opcional)
                        </Label>
                        <Input
                          value={serviceState?.notes ?? ""}
                          onChange={(event) =>
                            setSelectedServices((prev) => ({
                              ...prev,
                              [service.id]: {
                                quantity: prev[service.id]?.quantity ?? "1",
                                notes: event.target.value,
                              },
                            }))
                          }
                          placeholder="Ej: entrega urgente, instalación nocturna..."
                          className={controlClassName}
                        />
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2 text-sm text-neutral-700 sm:col-span-3">
                        Subtotal servicio:{" "}
                        <span className="font-semibold text-neutral-900">
                          {formatCurrency(subtotal, service.currency)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Resumen estimado
          </p>
          <div className="mt-2 space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-neutral-600">
              <span>Subtotal renta de caras (estimado)</span>
              <span>
                {formatCurrency(rentalEstimatedSubtotal, rentalCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Subtotal servicios</span>
              <span>{formatCurrency(servicesSubtotal, rentalCurrency)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>ITBMS 7% estimado</span>
              <span>{formatCurrency(combinedTax, rentalCurrency)}</span>
            </div>
            <div className="border-t border-neutral-200 pt-2 text-base font-semibold text-neutral-900">
              <div className="flex items-center justify-between">
                <span>Total estimado</span>
                <span>{formatCurrency(combinedTotal, rentalCurrency)}</span>
              </div>
            </div>
          </div>
          {estimatedDays !== null && (
            <p className="mt-2 text-xs text-neutral-500">
              Estimación de renta calculada para {estimatedDays} día
              {estimatedDays === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className="text-lg font-semibold text-neutral-900">Contacto</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Esta información se usará para coordinar la propuesta comercial.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="request-contact-name" className="text-neutral-700">
              Nombre
            </Label>
            <Input
              id="request-contact-name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Nombre de contacto"
              className={controlClassName}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-contact-email" className="text-neutral-700">
              Email
            </Label>
            <Input
              id="request-contact-email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="correo@empresa.com"
              className={controlClassName}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="request-contact-phone" className="text-neutral-700">
              Teléfono
            </Label>
            <Input
              id="request-contact-phone"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="+507 6000-0000"
              className={controlClassName}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(returnTo)}
            disabled={isValidating || createRequestMutation.isPending}
            className="h-10 rounded-md border-neutral-200 bg-white px-5 text-neutral-700 shadow-none hover:bg-neutral-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              isValidating ||
              createRequestMutation.isPending ||
              !hasValidDateRange
            }
            className="h-10 rounded-md bg-[#0359A8] px-5 text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8f]"
          >
            <ListFilter className="h-4 w-4" />
            {isValidating
              ? "Verificando disponibilidad..."
              : createRequestMutation.isPending
                ? "Enviando..."
                : hasFaces
                  ? `Solicitar cotización (${faces.length})`
                  : "Enviar solicitud"}
          </Button>
        </div>
      </section>
    </form>
  );
}
