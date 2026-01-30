"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

const statusOptions = ["ACTIVE", "INACTIVE", "MAINTENANCE", "RETIRED"] as const;

type AssetStatus = (typeof statusOptions)[number];

export function NewAssetForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const structureTypesQuery = trpc.inventory.structureTypes.list.useQuery();
  const zonesQuery = trpc.inventory.zones.list.useQuery();
  const roadTypesQuery = trpc.inventory.roadTypes.list.useQuery();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    structureTypeId: "",
    zoneId: "",
    roadTypeId: "",
    address: "",
    landmark: "",
    latitude: "",
    longitude: "",
    illuminated: false,
    digital: false,
    powered: false,
    hasPrintService: false,
    status: "ACTIVE" as AssetStatus,
    notes: "",
    installedDate: "",
    retiredDate: "",
  });

  const createAsset = trpc.inventory.assets.create.useMutation({
    onSuccess: () => {
      utils.inventory.assets.list.invalidate();
      router.push("/admin/inventory/assets");
    },
    onError: (err) => {
      if (err.message.includes("Unique constraint failed on the fields: (`code`)")) {
        setError("An asset with this code already exists. Please use a different code.");
      } else if (err.message.includes("Unique constraint")) {
        setError("A record with this value already exists.");
      } else {
        setError(err.message);
      }
    },
  });

  const canSave =
    form.code.trim() &&
    form.structureTypeId &&
    form.zoneId &&
    form.address.trim();

  return (
    <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          if (!canSave) return;

          const lat = form.latitude.trim() ? Number(form.latitude) : undefined;
          const lng = form.longitude.trim() ? Number(form.longitude) : undefined;

          if (lat !== undefined && (lat < -90 || lat > 90)) {
            setError("Latitude must be between -90 and 90");
            return;
          }
          if (lng !== undefined && (lng < -180 || lng > 180)) {
            setError("Longitude must be between -180 and 180");
            return;
          }

          createAsset.mutate({
            code: form.code.trim(),
            structureTypeId: form.structureTypeId,
            zoneId: form.zoneId,
            roadTypeId: form.roadTypeId || undefined,
            address: form.address.trim(),
            landmark: form.landmark.trim() || undefined,
            latitude: lat,
            longitude: lng,
            illuminated: form.illuminated,
            digital: form.digital,
            powered: form.powered,
            hasPrintService: form.hasPrintService,
            status: form.status,
            notes: form.notes.trim() || undefined,
            installedDate: form.installedDate
              ? new Date(form.installedDate)
              : undefined,
            retiredDate: form.retiredDate ? new Date(form.retiredDate) : undefined,
          });
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Code
            </label>
            <input
              value={form.code}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, code: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Structure Type
            </label>
            <select
              value={form.structureTypeId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  structureTypeId: event.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Select</option>
              {structureTypesQuery.data?.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Zone
            </label>
            <select
              value={form.zoneId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, zoneId: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Select</option>
              {zonesQuery.data?.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.province.name} - {zone.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Road Type (optional)
            </label>
            <select
              value={form.roadTypeId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, roadTypeId: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              <option value="">Select</option>
              {roadTypesQuery.data?.map((road) => (
                <option key={road.id} value={road.id}>
                  {road.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Address
            </label>
            <input
              value={form.address}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Landmark (optional)
            </label>
            <input
              value={form.landmark}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, landmark: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Latitude (-90 to 90)
            </label>
            <input
              type="number"
              step="0.000001"
              min="-90"
              max="90"
              placeholder="e.g. 8.9824"
              value={form.latitude}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, latitude: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Longitude (-180 to 180)
            </label>
            <input
              type="number"
              step="0.000001"
              min="-180"
              max="180"
              placeholder="e.g. -79.5199"
              value={form.longitude}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, longitude: event.target.value }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  status: event.target.value as AssetStatus,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.illuminated}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    illuminated: event.target.checked,
                  }))
                }
              />
              Illuminated
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.digital}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, digital: event.target.checked }))
                }
              />
              Digital
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.powered}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, powered: event.target.checked }))
                }
              />
              Powered
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={form.hasPrintService}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    hasPrintService: event.target.checked,
                  }))
                }
              />
              Print Service
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Installed Date
            </label>
            <input
              type="date"
              value={form.installedDate}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  installedDate: event.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Retired Date
            </label>
            <input
              type="date"
              value={form.retiredDate}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  retiredDate: event.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md dark:bg-neutral-800 dark:text-white"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={!canSave || createAsset.isPending}>
            {createAsset.isPending ? "Saving..." : "Create Asset"}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/inventory/assets">Cancel</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
