"use client";

import { Check, Plus, ShoppingCart } from "lucide-react";
import { useFaceSelection, type SelectedFace } from "@/components/face-selection-context";

interface FaceDetailActionsProps {
    face: SelectedFace;
}

export function FaceDetailActions({ face }: FaceDetailActionsProps) {
    const { isSelected, toggleFace, selectionCount } = useFaceSelection();
    const isFaceSelected = isSelected(face.id);

    return (
        <div className="space-y-3">
            <button
                type="button"
                onClick={() => toggleFace(face)}
                className={`
          mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition
          ${isFaceSelected
                        ? "border-2 border-[#0359A8] bg-[#0359A8]/5 text-[#0359A8] hover:bg-[#0359A8]/10"
                        : "bg-[#0359A8] text-white shadow-lg shadow-[#0359A8]/25 hover:bg-[#024a8c]"
                    }
        `}
            >
                {isFaceSelected ? (
                    <>
                        <Check className="h-4 w-4" strokeWidth={3} />
                        En tu selección
                    </>
                ) : (
                    <>
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                        Agregar a selección
                    </>
                )}
            </button>

            {selectionCount > 0 && (
                <p className="flex items-center justify-center gap-1.5 text-center text-xs text-neutral-500">
                    <ShoppingCart className="h-3.5 w-3.5" />
                    {selectionCount} {selectionCount === 1 ? "cara" : "caras"} en tu selección
                </p>
            )}
        </div>
    );
}
