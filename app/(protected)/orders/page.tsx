import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  PackageCheck,
  Truck,
} from "lucide-react";

export const metadata = {
  title: "Mis órdenes - MK Booking",
  description: "Consulta el estado de tus órdenes y reservas (próximamente).",
};

export default function OrdersPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          Mis órdenes
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Historial de órdenes, reservas y estado operativo
        </p>
      </div>

      {/* Coming soon */}
      <div className="flex flex-col items-center rounded-2xl border border-neutral-200/80 bg-white py-20 text-center">
        {/* Icon composition */}
        <div className="relative mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0359A8]/7">
            <PackageCheck className="h-8 w-8 text-[#0359A8]/60" />
          </div>
          <div className="absolute -right-3 -top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-amber-50">
            <Truck className="h-3.5 w-3.5 text-amber-500" />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-neutral-900">
          Próximamente disponible
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-neutral-500">
          Aquí podrás consultar tus órdenes confirmadas, dar seguimiento a producción e instalación, y descargar documentos asociados a tus campañas.
        </p>

        {/* Feature preview */}
        <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 text-left">
            <ClipboardList className="mb-2 h-5 w-5 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-700">
              Historial completo
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Montos, fechas y documentos de cada orden
            </p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 text-left">
            <Truck className="mb-2 h-5 w-5 text-neutral-400" />
            <p className="text-sm font-medium text-neutral-700">
              Seguimiento operativo
            </p>
            <p className="mt-0.5 text-xs text-neutral-500">
              Producción, instalación y publicación
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <Link
            href="/campaign-requests"
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Ir a solicitudes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
