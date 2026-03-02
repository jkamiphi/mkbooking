"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface AdminConfirmButtonProps {
    orderId: string;
}

export function AdminConfirmButton({ orderId }: AdminConfirmButtonProps) {
    const router = useRouter();
    const [isConfirming, setIsConfirming] = useState(false);

    const confirmMutation = trpc.orders.companyConfirm.useMutation({
        onSuccess: (data) => {
            toast.success("Orden Confirmada", {
                description: `Se han configurado ${data.createdHolds} bloqueos nuevos (saltados: ${data.skippedActiveHolds}).`,
            });
            setIsConfirming(false);
            router.refresh();
        },
        onError: (error) => {
            toast.error("Error al confirmar la orden", {
                description: error.message,
            });
            setIsConfirming(false);
        },
    });

    const handleConfirm = () => {
        setIsConfirming(true);
        confirmMutation.mutate({ id: orderId });
    };

    return (
        <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleConfirm}
            disabled={isConfirming}
        >
            <CheckSquare className="h-5 w-5" />
            {isConfirming ? "Procesando..." : "Confirmar Orden y Generar Holds"}
        </Button>
    );
}
