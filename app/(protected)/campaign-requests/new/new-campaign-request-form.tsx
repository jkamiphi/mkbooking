"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-neutral-900">Configuración de campaña</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Define tipo, zona, cantidad y rango de fechas para solicitar asignación de caras.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="request-structure-type">Tipo de estructura</Label>
            <SelectNative
              id="request-structure-type"
              value={structureTypeId}
              onChange={(event) => setStructureTypeId(event.target.value)}
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
            <Label htmlFor="request-zone">Zona</Label>
            <SelectNative
              id="request-zone"
              value={zoneId}
              onChange={(event) => setZoneId(event.target.value)}
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
            <Label htmlFor="request-quantity">Cantidad de caras</Label>
            <Input
              id="request-quantity"
              type="number"
              min={1}
              max={500}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="request-from">Desde</Label>
              <Input
                id="request-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="request-to">Hasta</Label>
              <Input
                id="request-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="request-notes">Notas</Label>
          <Textarea
            id="request-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Objetivo de campaña, ubicaciones preferidas, restricciones, etc."
            className="min-h-24"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <h2 className="text-lg font-semibold text-neutral-900">Contacto</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Esta informacion se usara para coordinar la propuesta comercial.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="request-contact-name">Nombre</Label>
            <Input
              id="request-contact-name"
              value={contactName}
              onChange={(event) => setContactName(event.target.value)}
              placeholder="Nombre de contacto"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="request-contact-email">Email</Label>
            <Input
              id="request-contact-email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="correo@empresa.com"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="request-contact-phone">Teléfono</Label>
            <Input
              id="request-contact-phone"
              value={contactPhone}
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="+507 6000-0000"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(returnTo)}
            disabled={createRequestMutation.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={createRequestMutation.isPending}>
            {createRequestMutation.isPending ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </div>
      </section>
    </form>
  );
}
