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

const promoTypes = ["PERCENT", "FIXED"] as const;

function parseDecimalInput(rawValue: string) {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) return null;

  const normalizedValue = trimmedValue.replace(",", ".");
  const numericValue = Number(normalizedValue);
  if (!Number.isFinite(numericValue)) return null;

  return numericValue;
}

export default function PromosPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof promoTypes)[number]>("PERCENT");
  const [value, setValue] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const parsedPromoValue = parseDecimalInput(value);
  const isPromoValueValid = parsedPromoValue !== null && parsedPromoValue >= 0;
  const utils = trpc.useUtils();
  const promosQuery = trpc.catalog.promos.list.useQuery();

  function resetFormState() {
    setName("");
    setType("PERCENT");
    setValue("");
    setFormError(null);
  }

  function handleDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen && createPromo.isPending) {
      return;
    }
    setIsCreateDialogOpen(nextOpen);
    if (!nextOpen) {
      resetFormState();
    }
  }

  function handleSubmitPromo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !isPromoValueValid || parsedPromoValue === null) {
      const message = "Ingresa un valor valido mayor o igual a 0.";
      setFormError(message);
      toast.error("Valor invalido", { description: message });
      return;
    }

    setFormError(null);
    createPromo.mutate({
      name: name.trim(),
      type,
      value: parsedPromoValue,
      isActive: true,
    });
  }

  const createPromo = trpc.catalog.promos.create.useMutation({
    onSuccess: () => {
      utils.catalog.promos.list.invalidate();
      toast.success("Promocion creada", {
        description: "La promocion se guardo correctamente.",
      });
      setIsCreateDialogOpen(false);
      resetFormState();
    },
    onError: (error) => {
      setFormError(error.message);
      toast.error("No se pudo crear la promocion", {
        description: error.message,
      });
    },
  });

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Promociones"
        description="Solo una promoción puede estar activa a la vez."
        actions={(
          <Button
            type="button"
            className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva promoción
          </Button>
        )}
      />
      <Dialog open={isCreateDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Crear promoción</DialogTitle>
            <DialogDescription>
              Define nombre, tipo y valor para una nueva promocion activa.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmitPromo}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Nombre</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre de la promoción"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Tipo</Label>
                <SelectNative
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as (typeof promoTypes)[number])
                  }
                >
                  {promoTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label className="mb-1.5 block">Valor</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Ej. 10 o 150.00"
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
                disabled={createPromo.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                disabled={!name.trim() || !isPromoValueValid || createPromo.isPending}
              >
                {createPromo.isPending ? "Guardando..." : "Guardar promoción"}
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
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Activo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
              {promosQuery.data?.map((promo) => (
                <TableRow
                  key={promo.id}
                >
                  <TableCell>{promo.name}</TableCell>
                  <TableCell className="text-muted-foreground">{promo.type}</TableCell>
                  <TableCell className="text-muted-foreground">{String(promo.value)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {promo.isActive ? "Sí" : "No"}
                  </TableCell>
                </TableRow>
              ))}
              {!promosQuery.data?.length && (
                <TableRow>
                  <TableCell className="py-4 text-center text-muted-foreground" colSpan={4}>
                    Aún no hay promociones.
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
