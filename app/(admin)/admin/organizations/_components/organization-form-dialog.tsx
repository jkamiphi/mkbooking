"use client";

import { useMemo, useState } from "react";
import { Building2, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";

const organizationTypeOptions = [
  { value: "ADVERTISER", label: "Anunciante" },
  { value: "AGENCY", label: "Agencia" },
  { value: "MEDIA_OWNER", label: "Dueño de medios" },
  { value: "PLATFORM_ADMIN", label: "Admin de plataforma" },
] as const;

const legalEntityTypeOptions = [
  { value: "NATURAL_PERSON", label: "Persona natural" },
  { value: "LEGAL_ENTITY", label: "Persona jurídica" },
] as const;

type OrganizationTypeValue = (typeof organizationTypeOptions)[number]["value"];
type LegalEntityTypeValue = (typeof legalEntityTypeOptions)[number]["value"];

interface OrganizationFormDialogProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    name: string;
    legalName: string | null;
    tradeName: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    taxId: string | null;
    cedula: string | null;
    industry: string | null;
    addressLine1: string | null;
    city: string | null;
    province: string | null;
    description: string | null;
    organizationType: OrganizationTypeValue;
    legalEntityType: LegalEntityTypeValue;
  };
  onSuccess?: () => void;
}

export function OrganizationFormDialog({
  mode,
  initialData,
  onSuccess,
}: OrganizationFormDialogProps) {
  const utils = trpc.useUtils();
  const isEdit = mode === "edit";

  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initialData?.name ?? "",
    organizationType: initialData?.organizationType ?? "ADVERTISER",
    legalEntityType: initialData?.legalEntityType ?? "LEGAL_ENTITY",
    legalName: initialData?.legalName ?? "",
    tradeName: initialData?.tradeName ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    website: initialData?.website ?? "",
    taxId: initialData?.taxId ?? "",
    cedula: initialData?.cedula ?? "",
    industry: initialData?.industry ?? "",
    addressLine1: initialData?.addressLine1 ?? "",
    city: initialData?.city ?? "",
    province: initialData?.province ?? "",
    description: initialData?.description ?? "",
  });

  const createOrganization = trpc.organization.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.organization.list.invalidate(),
        utils.organization.search.invalidate(),
      ]);
      setOpen(false);
      setError(null);
      onSuccess?.();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const updateOrganization = trpc.organization.update.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.organization.list.invalidate(),
        utils.organization.search.invalidate(),
      ]);
      setOpen(false);
      setError(null);
      onSuccess?.();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const pending = createOrganization.isPending || updateOrganization.isPending;
  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!canSubmit) return;

    if (isEdit && initialData) {
      updateOrganization.mutate({
        id: initialData.id,
        data: {
          name: form.name.trim(),
          legalName: form.legalName.trim() || undefined,
          tradeName: form.tradeName.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          website: form.website.trim() || undefined,
          taxId: form.taxId.trim() || undefined,
          cedula: form.cedula.trim() || undefined,
          industry: form.industry.trim() || undefined,
          addressLine1: form.addressLine1.trim() || undefined,
          city: form.city.trim() || undefined,
          province: form.province.trim() || undefined,
          description: form.description.trim() || undefined,
        },
      });
      return;
    }

    createOrganization.mutate({
      name: form.name.trim(),
      organizationType: form.organizationType,
      legalEntityType: form.legalEntityType,
      legalName: form.legalName.trim() || undefined,
      tradeName: form.tradeName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      website: form.website.trim() || undefined,
      taxId: form.taxId.trim() || undefined,
      cedula: form.cedula.trim() || undefined,
      industry: form.industry.trim() || undefined,
      addressLine1: form.addressLine1.trim() || undefined,
      city: form.city.trim() || undefined,
      province: form.province.trim() || undefined,
      description: form.description.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "outline" : "default"} size={isEdit ? "sm" : "default"}>
          {isEdit ? (
            <Pencil className="mr-2 h-4 w-4" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {isEdit ? "Editar" : "Nueva organización"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar organización" : "Crear organización"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualizar información comercial y de contacto."
              : "Registrar una nueva organización en la plataforma."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Nombre *</Label>
              <Input
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder="Ej. Publicidad Panamá S.A."
                required
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Tipo de organización</Label>
              <SelectNative
                value={form.organizationType}
                onChange={(event) =>
                  setField("organizationType", event.target.value as OrganizationTypeValue)
                }
                disabled={isEdit}
              >
                {organizationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <Label className="mb-1.5 block">Tipo de entidad legal</Label>
              <SelectNative
                value={form.legalEntityType}
                onChange={(event) =>
                  setField("legalEntityType", event.target.value as LegalEntityTypeValue)
                }
                disabled={isEdit}
              >
                {legalEntityTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div>
              <Label className="mb-1.5 block">Razón social</Label>
              <Input
                value={form.legalName}
                onChange={(event) => setField("legalName", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Nombre comercial</Label>
              <Input
                value={form.tradeName}
                onChange={(event) => setField("tradeName", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">RUC / Tax ID</Label>
              <Input
                value={form.taxId}
                onChange={(event) => setField("taxId", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Cédula</Label>
              <Input
                value={form.cedula}
                onChange={(event) => setField("cedula", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Sitio web</Label>
              <Input
                value={form.website}
                onChange={(event) => setField("website", event.target.value)}
                placeholder="https://empresa.com"
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Industria</Label>
              <Input
                value={form.industry}
                onChange={(event) => setField("industry", event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Dirección</Label>
              <Input
                value={form.addressLine1}
                onChange={(event) => setField("addressLine1", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Ciudad</Label>
              <Input
                value={form.city}
                onChange={(event) => setField("city", event.target.value)}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">Provincia</Label>
              <Input
                value={form.province}
                onChange={(event) => setField("province", event.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Label className="mb-1.5 block">Descripción</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(event) => setField("description", event.target.value)}
              />
            </div>
          </div>

          {error ? (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || pending}>
              <Building2 className="mr-2 h-4 w-4" />
              {pending
                ? isEdit
                  ? "Guardando..."
                  : "Creando..."
                : isEdit
                  ? "Guardar cambios"
                  : "Crear organización"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
