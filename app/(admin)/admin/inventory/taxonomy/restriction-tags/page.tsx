"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export default function RestrictionTagsPage() {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const utils = trpc.useUtils();
  const tagsQuery = trpc.inventory.restrictionTags.list.useQuery();
  const createTag = trpc.inventory.restrictionTags.create.useMutation({
    onSuccess: () => {
      utils.inventory.restrictionTags.list.invalidate();
      setCode("");
      setLabel("");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Etiquetas de Restricción
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Gestionar etiquetas de restricción normalizadas.
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <form
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!code.trim() || !label.trim()) return;
            createTag.mutate({ code: code.trim(), label: label.trim() });
          }}
        >
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Código (NO_ALCOHOL)"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Etiqueta"
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
          />
          <Button
            type="submit"
            disabled={!code.trim() || !label.trim() || createTag.isPending}
          >
            {createTag.isPending ? "Guardando..." : "Agregar Etiqueta"}
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4">Código</th>
                <th className="py-2 pr-4">Etiqueta</th>
              </tr>
            </thead>
            <tbody>
              {tagsQuery.data?.map((tag) => (
                <tr
                  key={tag.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4 text-neutral-900 dark:text-white">
                    {tag.code}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {tag.label}
                  </td>
                </tr>
              ))}
              {!tagsQuery.data?.length && (
                <tr>
                  <td
                    colSpan={2}
                    className="py-4 text-center text-neutral-500 dark:text-neutral-400"
                  >
                    Aún no hay etiquetas.
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
