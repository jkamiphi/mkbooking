import Link from "next/link";
import { FileClock, Package, Plus, ShoppingCart } from "lucide-react";
import { UserZoneNav } from "@/components/user/user-zone-nav";

export const metadata = {
  title: "Mis órdenes - MK Booking",
  description: "Consulta el estado de tus órdenes y reservas (próximamente).",
};

export default function OrdersPage() {
  return (
    <div className="relative mx-auto max-w-5xl px-6 pb-12">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/30">
            <ShoppingCart className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Mis órdenes</h1>
            <p className="text-sm text-neutral-500">
              Esta sección estará disponible cuando activemos el flujo de confirmación y compra.
            </p>
          </div>
        </div>
        <Link
          href="/campaign-requests/new"
          className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          <Plus className="h-4 w-4" />
          Crear solicitud
        </Link>
      </div>

      <UserZoneNav />

      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5">
            <div className="flex items-start gap-3">
              <FileClock className="mt-0.5 h-5 w-5 text-neutral-500" />
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Historial de órdenes
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Aquí verás tus órdenes confirmadas, montos, fechas y documentos.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-5">
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 text-neutral-500" />
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Estado operativo
                </h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Próximamente podrás dar seguimiento a producción, instalación y publicaciones.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-5 rounded-2xl border border-neutral-200 bg-neutral-50/70 px-4 py-3 text-sm text-neutral-600">
          Placeholder UI listo. La integración funcional con órdenes se conectará cuando esté
          disponible el backend de reservas/checkout.
        </p>
      </section>
    </div>
  );
}
