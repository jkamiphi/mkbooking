"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function ProvincesPage() {
  const [name, setName] = useState("");
  const utils = trpc.useUtils();
  const provincesQuery = trpc.inventory.provinces.list.useQuery();
  const createProvince = trpc.inventory.provinces.create.useMutation({
    onSuccess: () => {
      utils.inventory.provinces.list.invalidate();
      setName("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Provincias
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Gestionar provincias para zonificación del inventario.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="flex flex-col md:flex-row gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            createProvince.mutate({ name: name.trim() });
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de provincia"
            className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <Button type="submit" disabled={!name.trim() || createProvince.isPending}>
            {createProvince.isPending ? "Guardando..." : "Agregar Provincia"}
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4">Provincia</th>
              </tr>
            </thead>
            <tbody>
              {provincesQuery.data?.map((province) => (
                <tr
                  key={province.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4 text-neutral-900 dark:text-white">
                    {province.name}
                  </td>
                </tr>
              ))}
              {!provincesQuery.data?.length && (
                <tr>
                  <td className="py-4 text-center text-neutral-500 dark:text-neutral-400">
                    Aún no hay provincias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/inventory/taxonomy">Volver a taxonomía</Link>
      </Button>
    </div>
  );
}
