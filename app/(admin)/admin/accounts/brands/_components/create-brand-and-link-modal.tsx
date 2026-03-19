"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
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

export function CreateBrandAndLinkModal() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [agencyOrganizationId, setAgencyOrganizationId] = useState("");
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [taxId, setTaxId] = useState("");

  const agenciesQuery = trpc.admin.listManagedOrganizations.useQuery({
    organizationType: "AGENCY",
    isActive: true,
    skip: 0,
    take: 100,
    orderBy: "name",
    orderDirection: "asc",
  });

  async function invalidateViews() {
    await Promise.all([
      utils.admin.listBrands.invalidate(),
      utils.admin.listManagedOrganizations.invalidate(),
      utils.admin.listAccounts.invalidate(),
      utils.admin.stats.invalidate(),
    ]);
  }

  const createBrandAndLink = trpc.admin.createBrandAndLinkToAgency.useMutation({
    onSuccess: async () => {
      await invalidateViews();
      setName("");
      setLegalName("");
      setTradeName("");
      setTaxId("");
      setOpen(false);
      toast.success("Marca creada y vinculada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const agencies = agenciesQuery.data?.managedOrganizations ?? [];
  const effectiveAgencyOrganizationId = agencyOrganizationId || agencies[0]?.id || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) return;
        setAgencyOrganizationId("");
        setName("");
        setLegalName("");
        setTradeName("");
        setTaxId("");
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Crear marca
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear marca y vincularla a agencia</DialogTitle>
          <DialogDescription>
            Crea una marca cliente y registra de inmediato su vínculo operativo con una agencia.
          </DialogDescription>
        </DialogHeader>

        {agenciesQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando agencias...</p>
        ) : null}
        {agenciesQuery.error ? (
          <p className="text-sm text-red-600">No se pudo cargar agencias activas.</p>
        ) : null}
        {!agenciesQuery.isLoading && !agenciesQuery.error && agencies.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay agencias activas disponibles.
          </p>
        ) : null}

        {agencies.length > 0 ? (
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block">Agencia operativa</Label>
              <SelectNative
                value={effectiveAgencyOrganizationId}
                onChange={(event) => setAgencyOrganizationId(event.target.value)}
              >
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </SelectNative>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Nombre de marca *</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">Razón social</Label>
                <Input value={legalName} onChange={(event) => setLegalName(event.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">Nombre comercial</Label>
                <Input value={tradeName} onChange={(event) => setTradeName(event.target.value)} />
              </div>
              <div>
                <Label className="mb-1.5 block">RUC / Tax ID</Label>
                <Input value={taxId} onChange={(event) => setTaxId(event.target.value)} />
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            onClick={() =>
              createBrandAndLink.mutate({
                agencyOrganizationId: effectiveAgencyOrganizationId,
                name,
                legalName: legalName || undefined,
                tradeName: tradeName || undefined,
                taxId: taxId || undefined,
              })
            }
            disabled={
              createBrandAndLink.isPending || !effectiveAgencyOrganizationId || !name.trim()
            }
          >
            {createBrandAndLink.isPending ? "Creando..." : "Crear y vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
