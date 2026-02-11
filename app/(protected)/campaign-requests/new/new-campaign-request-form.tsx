"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ListFilter, MapPin, Search, Shapes } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";

type StructureTypeOption = {
  id: string;
  name: string;
};

type ZoneOption = {
  id: string;
  name: string;
  province: { name: string };
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
  returnTo: string;
  structureTypes: StructureTypeOption[];
  zones: ZoneOption[];
};

function formatDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (!Number.isFinite(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  returnTo,
  structureTypes,
  zones,
}: NewCampaignRequestFormProps) {
  const router = useRouter();

  const [structureTypeId, setStructureTypeId] = useState(defaultStructureTypeId ?? "");
  const [zoneId, setZoneId] = useState(defaultZoneId ?? "");
  const [quantity, setQuantity] = useState(String(defaultQuantity));
  const [fromDate, setFromDate] = useState(defaultFromDate ?? "");
  const [toDate, setToDate] = useState(defaultToDate ?? "");
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState(defaultContactName ?? "");
  const [contactEmail, setContactEmail] = useState(defaultContactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(defaultContactPhone ?? "");
  const selectedStructureType = structureTypes.find((type) => type.id === structureTypeId);
  const selectedZone = zones.find((zone) => zone.id === zoneId);
  const hasSearchContext = Boolean(
    query ||
      selectedStructureType ||
      selectedZone ||
      fromDate ||
      toDate,
  );

  const sectionClassName =
    "rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl";
  const controlClassName =
    "h-11 rounded-2xl border-neutral-200 bg-white px-4 shadow-none transition focus-visible:border-[#0359A8] focus-visible:ring-2 focus-visible:ring-[#0359A8]/20";
  const textareaClassName =
    "min-h-24 rounded-2xl border-neutral-200 bg-white px-4 py-3 shadow-none transition focus-visible:border-[#0359A8] focus-visible:ring-2 focus-visible:ring-[#0359A8]/20";

  const createRequestMutation = trpc.catalog.requests.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitud enviada", {
        description: "El equipo comercial revisará tu campaña desde admin.",
      });
      router.push(returnTo);
      router.refresh();
    },
    onError: (error) => {
      toast.error("No se pudo enviar la solicitud", {
        description: error.message,
      });
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedQuantity = Number(quantity);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1) {
      toast.error("Cantidad inválida", {
        description: "Debes solicitar al menos 1 cara.",
      });
      return;
    }

    createRequestMutation.mutate({
      query: query || undefined,
      structureTypeId: structureTypeId || undefined,
      zoneId: zoneId || undefined,
      quantity: parsedQuantity,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      notes: notes.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasSearchContext ? (
        <section className={sectionClassName}>
          <h2 className="text-lg font-semibold text-neutral-900">Contexto de búsqueda</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Esta solicitud conserva los filtros activos para mantener continuidad con el catálogo.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {query ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                <Search className="h-3.5 w-3.5 text-neutral-500" />
                {query}
              </span>
            ) : null}
            {selectedStructureType ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                <Shapes className="h-3.5 w-3.5 text-neutral-500" />
                {selectedStructureType.name}
              </span>
            ) : null}
            {selectedZone ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                <MapPin className="h-3.5 w-3.5 text-neutral-500" />
                {selectedZone.name}, {selectedZone.province.name}
              </span>
            ) : null}
            {fromDate || toDate ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-medium text-neutral-700">
                <CalendarDays className="h-3.5 w-3.5 text-neutral-500" />
                {fromDate ? formatDateLabel(fromDate) : "Sin fecha inicial"} -{" "}
                {toDate ? formatDateLabel(toDate) : "Sin fecha final"}
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={sectionClassName}>
        <h2 className="text-lg font-semibold text-neutral-900">Configuración de campaña</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Define tipo, zona, cantidad y rango de fechas para solicitar asignación de caras.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="request-structure-type" className="text-neutral-700">
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
            <p className="text-xs text-neutral-500">Mínimo 1, máximo 500.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <div className="space-y-1.5">
              <Label htmlFor="request-from" className="text-neutral-700">
                Desde
              </Label>
              <Input
                id="request-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className={controlClassName}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-to" className="text-neutral-700">
                Hasta
              </Label>
              <Input
                id="request-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className={controlClassName}
              />
            </div>
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
            disabled={createRequestMutation.isPending}
            className="h-10 rounded-full border-neutral-200 bg-white px-5 text-neutral-700 shadow-none hover:bg-neutral-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={createRequestMutation.isPending}
            className="h-10 rounded-full bg-[#0359A8] px-5 text-white shadow-lg shadow-[#0359A8]/30 hover:bg-[#024a8f]"
          >
            <ListFilter className="h-4 w-4" />
            {createRequestMutation.isPending ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </div>
      </section>
    </form>
  );
}
