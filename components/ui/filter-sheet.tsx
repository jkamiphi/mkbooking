"use client";

import * as React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export interface FilterSummaryChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface FilterSheetToolbarProps {
  children: React.ReactNode;
  summaryChips?: FilterSummaryChip[];
  onClearAll?: () => void;
  className?: string;
}

type FilterSheetTriggerButtonProps = React.ComponentProps<typeof Button> & {
  activeCount?: number;
  label?: string;
};

interface FilterSheetPanelProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  onApply: () => void;
  onClear: () => void;
  applyLabel?: string;
  clearLabel?: string;
  className?: string;
  bodyClassName?: string;
}

interface FilterSheetSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

interface FilterSummaryChipsProps {
  chips: FilterSummaryChip[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterSheetToolbar({
  children,
  summaryChips = [],
  onClearAll,
  className,
}: FilterSheetToolbarProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {summaryChips.length > 0 ? (
        <FilterSummaryChips chips={summaryChips} onClearAll={onClearAll} />
      ) : null}
    </div>
  );
}

export const FilterSheetTriggerButton = React.forwardRef<
  HTMLButtonElement,
  FilterSheetTriggerButtonProps
>(function FilterSheetTriggerButton(
  {
    activeCount = 0,
    label = "Filtros",
    className,
    type = "button",
    variant = "outline",
    size = "sm",
    ...props
  },
  ref,
) {
  return (
    <Button
      ref={ref}
      type={type}
      variant={variant}
      size={size}
      className={cn(
        "h-9 rounded-md border-mkmedia-blue/20 bg-white px-4 text-mkmedia-blue shadow-none hover:border-mkmedia-blue/35 hover:bg-mkmedia-blue/8",
        className,
      )}
      {...props}
    >
      <SlidersHorizontal className="h-4 w-4" />
      {label}
      {activeCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-mkmedia-blue px-1.5 text-[10px] font-bold text-white">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
});

export function FilterSummaryChips({
  chips,
  onClearAll,
  className,
}: FilterSummaryChipsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex min-h-8 items-center gap-2 rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-3 py-1.5 text-xs font-semibold text-mkmedia-blue transition hover:bg-mkmedia-blue/15"
        >
          <span>{chip.label}</span>
          <X className="h-3.5 w-3.5" />
        </button>
      ))}

      {onClearAll ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-8 rounded-md px-3 text-xs text-neutral-500 hover:text-neutral-700"
        >
          Limpiar todo
        </Button>
      ) : null}
    </div>
  );
}

export function FilterSheetPanel({
  title,
  description,
  children,
  onApply,
  onClear,
  applyLabel = "Aplicar filtros",
  clearLabel = "Limpiar",
  className,
  bodyClassName,
}: FilterSheetPanelProps) {
  return (
    <SheetContent
      side="right"
      className={cn(
        "h-dvh w-full gap-0 overflow-hidden border-l border-neutral-200 p-0 sm:max-w-md",
        className,
      )}
    >
      <SheetHeader className="border-b border-neutral-200 px-5 py-4">
        <SheetTitle className="text-base font-semibold text-neutral-950">
          {title}
        </SheetTitle>
        {description ? (
          <SheetDescription className="text-sm text-neutral-500">
            {description}
          </SheetDescription>
        ) : null}
      </SheetHeader>

      <div
        className={cn(
          "flex-1 space-y-5 overflow-y-auto px-5 py-5",
          bodyClassName,
        )}
      >
        {children}
      </div>

      <SheetFooter className="border-t border-neutral-200 bg-white/95 px-5 py-4 backdrop-blur">
        <div className="flex w-full items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClear}>
            {clearLabel}
          </Button>
          <Button
            type="button"
            onClick={onApply}
            className="bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
          >
            {applyLabel}
          </Button>
        </div>
      </SheetFooter>
    </SheetContent>
  );
}

export function FilterSheetSection({
  title,
  description,
  children,
  className,
}: FilterSheetSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        {description ? (
          <p className="text-xs text-neutral-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
