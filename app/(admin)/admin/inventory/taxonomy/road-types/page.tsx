"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function RoadTypesPage() {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const typesQuery = trpc.inventory.roadTypes.list.useQuery();
  const createType = trpc.inventory.roadTypes.create.useMutation({
    onSuccess: () => {
      utils.inventory.roadTypes.list.invalidate();
      setName("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Tipos de Vía
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Gestionar tipos de vía (Ave, Calle, Autopista).
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createType.mutate({ name: name.trim() });
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre del tipo de vía"
            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <Button type="submit" disabled={!name.trim() || createType.isPending}>
            {createType.isPending ? "Guardando..." : "Agregar Tipo"}
          </Button>
        </form>

        <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-2">
          {typesQuery.data?.map((type) => (
            <li key={type.id}>{type.name}</li>
          ))}
          {!typesQuery.data?.length && (
            <li className="text-neutral-500 dark:text-neutral-400">
              Aún no hay tipos de vía.
            </li>
          )}
        </ul>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/inventory/taxonomy">Volver a taxonomía</Link>
      </Button>
    </div>
  );
}
