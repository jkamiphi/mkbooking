"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

export function CatalogFaceDetail({ faceId }: { faceId: string }) {
  const utils = trpc.useUtils();
  const faceQuery = trpc.catalog.faces.get.useQuery({ faceId });

  const [form, setForm] = useState({
    title: "",
    summary: "",
    highlight: "",
    primaryImageUrl: "",
    isPublished: false,
  });
  const [price, setPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (!faceQuery.data) return;
    setForm({
      title: faceQuery.data.title ?? "",
      summary: faceQuery.data.summary ?? "",
      highlight: faceQuery.data.highlight ?? "",
      primaryImageUrl: faceQuery.data.primaryImageUrl ?? "",
      isPublished: faceQuery.data.isPublished ?? false,
    });
  }, [faceQuery.data]);

  const upsertFace = trpc.catalog.faces.upsert.useMutation({
    onSuccess: () => {
      utils.catalog.faces.get.invalidate({ faceId });
      utils.catalog.faces.list.invalidate();
    },
  });

  const createRule = trpc.catalog.priceRules.create.useMutation({
    onSuccess: () => {
      utils.catalog.faces.get.invalidate({ faceId });
      utils.catalog.faces.list.invalidate();
      utils.catalog.priceRules.list.invalidate({ faceId });
      setPrice("");
      setStartDate("");
      setEndDate("");
    },
  });

  if (faceQuery.isLoading) {
    return (
      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        Loading face...
      </div>
    );
  }

  if (!faceQuery.data) {
    return (
      <div className="text-sm text-red-500">Face not found.</div>
    );
  }

  const face = faceQuery.data.face;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          {face.asset.code} - Face {face.code}
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          {face.asset.zone.province.name} - {face.asset.zone.name}
        </p>
      </div>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Catalog Details
        </h2>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            upsertFace.mutate({
              faceId,
              title: form.title.trim() || undefined,
              summary: form.summary.trim() || undefined,
              highlight: form.highlight.trim() || undefined,
              primaryImageUrl: form.primaryImageUrl.trim() || undefined,
              isPublished: form.isPublished,
            });
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Title
              </label>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, title: event.target.value }))
                }
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Summary
              </label>
              <textarea
                value={form.summary}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, summary: event.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Highlight
              </label>
              <input
                value={form.highlight}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, highlight: event.target.value }))
                }
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Primary Image URL
              </label>
              <input
                value={form.primaryImageUrl}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    primaryImageUrl: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    isPublished: event.target.checked,
                  }))
                }
              />
              Published
            </label>
          </div>
          <Button type="submit" disabled={upsertFace.isPending}>
            {upsertFace.isPending ? "Saving..." : "Save Catalog Details"}
          </Button>
        </form>
      </section>

      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Face Price Rules
        </h2>
        <form
          className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
          onSubmit={(event) => {
            event.preventDefault();
            if (!price.trim()) return;
            createRule.mutate({
              faceId,
              priceDaily: Number(price),
              startDate: startDate ? new Date(startDate) : undefined,
              endDate: endDate ? new Date(endDate) : undefined,
              isActive: true,
            });
          }}
        >
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Daily Price (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <Button
            type="submit"
            disabled={!price.trim() || createRule.isPending}
          >
            {createRule.isPending ? "Saving..." : "Add Rule"}
          </Button>
        </form>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4">Price</th>
                <th className="py-2 pr-4">Start</th>
                <th className="py-2 pr-4">End</th>
                <th className="py-2 pr-4">Active</th>
              </tr>
            </thead>
            <tbody>
              {faceQuery.data.priceRules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-neutral-100 dark:border-neutral-800"
                >
                  <td className="py-2 pr-4 text-neutral-900 dark:text-white">
                    {rule.currency} {rule.priceDaily}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {rule.startDate.toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {rule.endDate ? rule.endDate.toLocaleDateString() : "-"}
                  </td>
                  <td className="py-2 pr-4 text-neutral-600 dark:text-neutral-300">
                    {rule.isActive ? "Yes" : "No"}
                  </td>
                </tr>
              ))}
              {!faceQuery.data.priceRules.length && (
                <tr>
                  <td className="py-4 text-center text-neutral-500 dark:text-neutral-400" colSpan={4}>
                    No price rules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Button variant="outline" asChild>
        <Link href="/admin/catalog/faces">Back to faces</Link>
      </Button>
    </div>
  );
}
