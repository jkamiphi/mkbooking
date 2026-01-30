"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export function CatalogFacesContent() {
  const [search, setSearch] = useState("");
  const [publishedFilter, setPublishedFilter] = useState("");

  const facesQuery = trpc.catalog.faces.list.useQuery({
    search: search.trim() || undefined,
    isPublished:
      publishedFilter === ""
        ? undefined
        : publishedFilter === "published",
    take: 100,
  });

  const promo = facesQuery.data?.promo;

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Promoción activa
          </p>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">
            {promo
              ? `${promo.name} (${promo.type} ${String(promo.value)})`
              : "Sin promoción activa"}
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por cara o código de activo"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <select
            value={publishedFilter}
            onChange={(event) => setPublishedFilter(event.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          >
            <option value="">Todos</option>
            <option value="published">Publicado</option>
            <option value="draft">Borrador</option>
          </select>
        </div>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Caras
        </h2>
        {facesQuery.isLoading ? (
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            Cargando caras del catálogo...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-4">Activo</th>
                  <th className="py-2 pr-4">Cara</th>
                  <th className="py-2 pr-4">Zona</th>
                  <th className="py-2 pr-4">Publicado</th>
                  <th className="py-2 pr-4">Precio de Cara</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {facesQuery.data?.faces.map((face) => (
                  <tr
                    key={face.id}
                    className="border-b border-neutral-100 dark:border-neutral-800"
                  >
                    <td className="py-2 pr-4 font-medium text-neutral-900 dark:text-white">
                      {face.asset.code}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.code}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.asset.zone.province.name} - {face.asset.zone.name}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.catalogFace?.isPublished ? "Sí" : "No"}
                    </td>
                    <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                      {face.effectivePrice
                        ? `${face.effectivePrice.currency} ${face.effectivePrice.priceDaily}`
                        : "-"}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/catalog/faces/${face.id}`}>
                          Gestionar
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {!facesQuery.data?.faces.length && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      No se encontraron caras.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
