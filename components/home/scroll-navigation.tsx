"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type ScrollNavigationProps = {
  targetId: string;
  title: string;
};

export function ScrollNavigation({ targetId, title }: ScrollNavigationProps) {
  const handleScroll = (direction: "left" | "right") => {
    const container = document.getElementById(targetId);
    if (container) {
      container.scrollBy({
        left: direction === "left" ? -176 : 176,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleScroll("left")}
          className="rounded-md border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 transition"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleScroll("right")}
          className="rounded-md border border-neutral-200 p-2 text-neutral-600 hover:bg-neutral-50 transition"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
