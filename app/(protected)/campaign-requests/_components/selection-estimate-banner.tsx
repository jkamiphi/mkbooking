"use client";

import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useFaceSelection } from "@/components/face-selection-context";

export function SelectionEstimateBanner() {
    const { selectedFaces, selectionCount } = useFaceSelection();

    if (selectionCount === 0) return null;

    const pricedFaces = selectedFaces.filter(
        (f) => f.priceDaily !== null && f.priceDaily > 0
    );
    const dailyTotal = pricedFaces.reduce(
        (sum, f) => sum + (f.priceDaily ?? 0),
        0
    );
    const currency = pricedFaces[0]?.currency ?? "USD";

    const fmt = (v: number) => {
        try {
            return new Intl.NumberFormat("es-PA", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
            }).format(v);
        } catch {
            return `$${v.toFixed(0)}`;
        }
    };

    const faceIdsParam = selectedFaces.map((f) => f.id).join(",");
    const quoteUrl = `/campaign-requests/new?faces=${encodeURIComponent(faceIdsParam)}&returnTo=${encodeURIComponent("/campaign-requests")}`;

    return (
        <div className="mb-6 rounded-2xl border border-[#0359A8]/20 bg-linear-to-r from-[#0359A8]/5 to-[#0359A8]/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0359A8]/10">
                        <ShoppingCart className="h-5 w-5 text-[#0359A8]" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-neutral-900">
                            {selectionCount} {selectionCount === 1 ? "cara" : "caras"} en tu
                            selección
                            {pricedFaces.length > 0 && (
                                <span className="ml-2 text-[#0359A8]">
                                    ~{fmt(dailyTotal)}/día
                                </span>
                            )}
                        </p>
                        <p className="text-xs text-neutral-500">
                            {pricedFaces.length > 0 && pricedFaces.length < selectionCount
                                ? `${pricedFaces.length} de ${selectionCount} con precio · `
                                : ""}
                            Define fechas en la solicitud para ver el total estimado.
                        </p>
                    </div>
                </div>
                <Link
                    href={quoteUrl}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0359A8] px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#0359A8]/20 transition hover:bg-[#024a8f]"
                >
                    Solicitar cotización
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}
