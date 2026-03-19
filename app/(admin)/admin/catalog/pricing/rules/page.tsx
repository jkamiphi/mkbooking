"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function parseDecimalInput(rawValue: string) {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) return null;

  const normalizedValue = trimmedValue.replace(",", ".");
  const numericValue = Number(normalizedValue);
  if (!Number.isFinite(numericValue)) return null;

  return numericValue;
}

export default function PriceRulesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [faceId, setFaceId] = useState("");
  const [structureTypeId, setStructureTypeId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const parsedPrice = parseDecimalInput(price);
  const isPriceValid = parsedPrice !== null && parsedPrice >= 0;

  const utils = trpc.useUtils();
  const facesQuery = trpc.catalog.faces.pricingOptions.useQuery({ take: 100 });
  const structureTypesQuery = trpc.inventory.structureTypes.publicList.useQuery();
  const zonesQuery = trpc.inventory.zones.publicList.useQuery();
  const brandsQuery = trpc.admin.listBrands.useQuery({ skip: 0, take: 100 });
  const rulesQuery = trpc.catalog.priceRules.list.useQuery();

  function resetFormState() {
    setFaceId("");
    setStructureTypeId("");
    setZoneId("");
    setBrandId("");
    setPrice("");
    setStartDate("");
    setEndDate("");
    setFormError(null);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && createRule.isPending) {
      return;
    }
    setIsCreateDialogOpen(nextOpen);
    if (!nextOpen) {
      resetFormState();
    }
  }

  function handleSubmitRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isPriceValid || parsedPrice === null) {
      const message = "Ingresa un precio diario valido mayor o igual a 0.";
      setFormError(message);
      toast.error("Precio invalido", { description: message });
      return;
    }

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      const message = "La fecha fin debe ser mayor o igual a la fecha inicio.";
      setFormError(message);
      toast.error("Rango de fechas invalido", { description: message });
      return;
    }

    setFormError(null);
    createRule.mutate({
      faceId: faceId || undefined,
      structureTypeId: structureTypeId || undefined,
      zoneId: zoneId || undefined,
      brandId: brandId || undefined,
      priceDaily: parsedPrice,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: true,
    });
  }

  const createRule = trpc.catalog.priceRules.create.useMutation({
    onSuccess: () => {
      utils.catalog.priceRules.list.invalidate();
      toast.success("Regla de precio creada", {
        description: "La regla se guardo correctamente.",
      });
      setIsCreateDialogOpen(false);
      resetFormState();
    },
    onError: (error) => {
      setFormError(error.message);
      toast.error("No se pudo crear la regla de precio", {
        description: error.message,
      });
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Reglas de precio"
        description="Definir precios por cara, tipo de estructura, zona y cliente."
        actions={(
          <Button
            type="button"
            className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva regla
          </Button>
        )}
      />
      <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear regla de precio</DialogTitle>
            <DialogDescription>
              Define alcance, vigencia y valor diario para esta regla.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitRule}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Cara</Label>
                <SelectNative
                  value={faceId}
                  onChange={(event) => setFaceId(event.target.value)}
                >
                  <option value="">Todas las caras</option>
                  {facesQuery.data?.map((face) => (
                    <option key={face.id} value={face.id}>
                      {face.asset.code} - {face.code}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label className="mb-1.5 block">Tipo de estructura</Label>
                <SelectNative
                  value={structureTypeId}
                  onChange={(event) => setStructureTypeId(event.target.value)}
                >
                  <option value="">Todos los tipos de estructura</option>
                  {structureTypesQuery.data?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label className="mb-1.5 block">Zona</Label>
                <SelectNative
                  value={zoneId}
                  onChange={(event) => setZoneId(event.target.value)}
                >
                  <option value="">Todas las zonas</option>
                  {zonesQuery.data?.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.province.name} - {zone.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label className="mb-1.5 block">Marca</Label>
                <SelectNative
                  value={brandId}
                  onChange={(event) => setBrandId(event.target.value)}
                >
                  <option value="">Todas las marcas</option>
                  {brandsQuery.data?.brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label className="mb-1.5 block">Precio diario</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="Ej. 125.50"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Fecha de inicio</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Fecha de fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            {formError ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
                disabled={createRule.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                disabled={!isPriceValid || createRule.isPending}
              >
                {createRule.isPending ? "Guardando..." : "Guardar regla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Card>
        <CardContent className="pt-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alcance</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {rulesQuery.data?.map((rule) => (
                <TableRow
                  key={rule.id}
                >
                  <TableCell>
                    {rule.face?.face
                      ? `${rule.face.face.asset.code} - ${rule.face.face.code}`
                      : rule.zone
                      ? `${rule.zone.province.name} - ${rule.zone.name}`
                      : rule.structureType
                      ? rule.structureType.name
                      : "Global"}
                    {rule.brand ? ` · ${rule.brand.name}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.currency} {String(rule.priceDaily)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.startDate.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.endDate ? rule.endDate.toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {rule.isActive ? "Sí" : "No"}
                  </TableCell>
                </TableRow>
              ))}
              {!rulesQuery.data?.length && (
                <TableRow>
                  <TableCell className="py-4 text-center text-muted-foreground" colSpan={5}>
                    Aún no hay reglas.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/admin/catalog/pricing">Volver a precios</Link>
      </Button>
    </AdminPageShell>
  );
}
