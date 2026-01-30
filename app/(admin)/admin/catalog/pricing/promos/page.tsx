"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const promoTypes = ["PERCENT", "FIXED"] as const;

export default function PromosPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof promoTypes)[number]>("PERCENT");
  const [value, setValue] = useState("");
  const utils = trpc.useUtils();
  const promosQuery = trpc.catalog.promos.list.useQuery();
  const createPromo = trpc.catalog.promos.create.useMutation({
    onSuccess: () => {
      utils.catalog.promos.list.invalidate();
      setName("");
      setValue("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Promociones
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Solo una promoción puede estar activa a la vez.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim() || !value.trim()) return;
            createPromo.mutate({
              name: name.trim(),
              type,
              value: Number(value),
              isActive: true,
            });
          }}
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la promoción"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <select
            value={type}
            onChange={(event) =>
              setType(event.target.value as (typeof promoTypes)[number])
            }
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            {promoTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Valor"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <Button
            type="submit"
            disabled={!name.trim() || !value.trim() || createPromo.isPending}
          >
            {createPromo.isPending ? "Guardando..." : "Crear Promoción"}
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Valor</th>
                <th className="py-2 pr-4">Activo</th>
              </tr>
            </thead>
            <tbody>
              {promosQuery.data?.map((promo) => (
                <tr
                  key={promo.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4 text-neutral-900 dark:text-white">
                    {promo.name}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {promo.type}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {String(promo.value)}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {promo.isActive ? "Sí" : "No"}
                  </td>
                </tr>
              ))}
              {!promosQuery.data?.length && (
                <tr>
                  <td className="py-4 text-center text-neutral-500 dark:text-neutral-400" colSpan={4}>
                    Aún no hay promociones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/catalog/pricing">Volver a precios</Link>
      </Button>
    </div>
  );
}
