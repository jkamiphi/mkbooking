"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface ClientApprovalButtonProps {
    orderId: string;
}

export function ClientApprovalButton({ orderId }: ClientApprovalButtonProps) {
    const router = useRouter();
    const [isApproving, setIsApproving] = useState(false);

    const approveMutation = trpc.orders.clientApprove.useMutation({
        onSuccess: () => {
            toast.success("Cotización aprobada exitosamente", {
                description: "El equipo revisará tu aprobación y confirmará la orden.",
            });
            router.refresh();
        },
        onError: (error) => {
            toast.error("Error al aprobar la cotización", {
                description: error.message,
            });
            setIsApproving(false);
        },
    });

    const handleApprove = () => {
        setIsApproving(true);
        approveMutation.mutate({ id: orderId });
    };

    return (
        <Button
            size="lg"
            className="w-full gap-2 bg-[#0359A8] hover:bg-[#024a8f]"
            onClick={handleApprove}
            disabled={isApproving}
        >
            <CheckCircle2 className="h-5 w-5" />
            {isApproving ? "Aprobando..." : "Aprobar Cotización"}
        </Button>
    );
}
