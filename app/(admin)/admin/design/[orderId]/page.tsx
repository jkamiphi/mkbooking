import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { createServerTRPCCaller } from "@/lib/trpc/server";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, AdminPageShell } from "@/components/admin/page-shell";
import { DesignWorkspace } from "@/components/orders/design-workspace";
import { DesignTaskPanel } from "../../orders/[orderId]/_components/design-task-panel";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

function formatDate(value: Date | null) {
  if (!value) return "No definida";
  return value.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminDesignOrderPage({ params }: PageProps) {
  const { orderId } = await params;
  const caller = await createServerTRPCCaller();
  const profile = await caller.userProfile.current();

  if (!profile || !["SUPERADMIN", "STAFF", "DESIGNER"].includes(profile.systemRole)) {
    redirect("/admin/orders");
  }

  const order = await caller.orders.get({ id: orderId }).catch((error: unknown) => {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  });

  const creativeLineItems = order.lineItems.map((item) => ({
    id: item.id,
    face: item.face
      ? {
          code: item.face.code,
          catalogFace: item.face.catalogFace
            ? {
                title: item.face.catalogFace.title,
              }
            : null,
          asset: item.face.asset
            ? {
                structureType: item.face.asset.structureType
                  ? {
                      name: item.face.asset.structureType.name,
                    }
                  : null,
                zone: item.face.asset.zone
                  ? {
                      name: item.face.asset.zone.name,
                    }
                  : null,
              }
            : null,
        }
      : null,
  }));

  return (
    <AdminPageShell>
      <div className="mb-4">
        <Link
          href="/admin/design"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Regresar a Bandeja de Diseño
        </Link>
      </div>

      <AdminPageHeader
        title={`Diseño de Orden ${order.code}`}
        description="Vista enfocada en artes, pruebas y decisiones cliente-diseno."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge variant="info" className="text-sm">
          {order.status}
        </Badge>
        <span className="text-sm text-neutral-500">Emitida el {formatDate(order.createdAt)}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <DesignWorkspace
            orderId={order.id}
            lineItems={creativeLineItems}
            mode="designer"
            allowReviewActions
          />
        </div>

        <div className="space-y-5">
          <DesignTaskPanel orderId={order.id} />
        </div>
      </div>
    </AdminPageShell>
  );
}
