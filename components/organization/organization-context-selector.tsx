"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type OrganizationContextSelectorProps = {
  variant?: "compact" | "sidebar";
  className?: string;
};

function getAccessLabel(context: {
  accessType: "DIRECT" | "DELEGATED";
  viaOrganizationName: string | null;
}) {
  if (context.accessType === "DIRECT") {
    return "Acceso directo";
  }

  return context.viaOrganizationName
    ? `Vía ${context.viaOrganizationName}`
    : "Acceso delegado";
}

export function OrganizationContextSelector({
  variant = "compact",
  className,
}: OrganizationContextSelectorProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isSaving, setIsSaving] = useState(false);
  const { data, isLoading } = trpc.organization.myContexts.useQuery();

  const contexts = data?.contexts ?? [];
  const activeContext = data?.activeContext ?? contexts[0] ?? null;

  async function handleContextChange(nextContextKey: string) {
    if (!activeContext || nextContextKey === activeContext.contextKey || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/organization-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contextKey: nextContextKey }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar el contexto activo.");
      }

      await Promise.all([
        utils.userProfile.current.invalidate(),
        utils.userProfile.me.invalidate(),
        utils.organization.myContexts.invalidate(),
        utils.organization.myOrganizations.invalidate(),
        utils.catalog.requests.mine.invalidate(),
        utils.orders.mine.invalidate(),
      ]);

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error("No se pudo cambiar el contexto", {
        description:
          error instanceof Error
            ? error.message
            : "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          variant === "sidebar"
            ? "h-20 animate-pulse rounded-2xl border border-neutral-200/80 bg-neutral-50/70"
            : "h-10 w-44 animate-pulse rounded-full border border-neutral-200/80 bg-white/80",
          className,
        )}
      />
    );
  }

  if (!activeContext) {
    return null;
  }

  const isSingleContext = contexts.length <= 1;

  if (variant === "sidebar") {
    const sidebarBody = (
      <>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-mkmedia-blue/20 bg-mkmedia-blue/8 text-mkmedia-blue">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="[font-family:var(--font-mkmedia)] text-[10px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue">
              Operando como
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-neutral-950">
              {activeContext.organizationName}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {getAccessLabel(activeContext)}
            </p>
          </div>
          {!isSingleContext ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
          ) : null}
        </div>
        {activeContext.accessType === "DELEGATED" ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-mkmedia-yellow/35 bg-mkmedia-yellow/15 px-3 py-2 text-xs text-neutral-700">
            <Link2 className="h-3.5 w-3.5 text-neutral-700" />
            <span className="truncate">
              Cliente delegado por {activeContext.viaOrganizationName}
            </span>
          </div>
        ) : null}
      </>
    );

    if (isSingleContext) {
      return (
        <div
          className={cn(
            "rounded-3xl border border-neutral-200/80 bg-white px-4 py-4 shadow-sm",
            className,
          )}
        >
          {sidebarBody}
        </div>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full rounded-3xl border border-neutral-200/80 bg-white px-4 py-4 text-left shadow-sm transition hover:border-mkmedia-blue/30 hover:bg-mkmedia-blue/[0.04]",
              className,
            )}
            disabled={isSaving}
          >
            {sidebarBody}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80 border-neutral-200 bg-white">
          <DropdownMenuLabel className="text-xs uppercase tracking-[0.16em] text-neutral-500">
            Contexto organizacional
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={activeContext.contextKey}
            onValueChange={(value) => {
              void handleContextChange(value);
            }}
          >
            {contexts.map((context) => (
              <DropdownMenuRadioItem
                key={context.contextKey}
                value={context.contextKey}
                disabled={isSaving}
                className="items-start py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900">
                    {context.organizationName}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {getAccessLabel(context)}
                  </p>
                </div>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const compactTrigger = (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-10 rounded-full border border-neutral-200 bg-white/90 px-3 text-neutral-700 shadow-sm hover:bg-white",
        isSingleContext ? "cursor-default" : "hover:border-mkmedia-blue/30",
        className,
      )}
      disabled={isSaving || isSingleContext}
    >
      {isSaving ? (
        <LoaderCircle className="h-4 w-4 animate-spin text-mkmedia-blue" />
      ) : (
        <Building2 className="h-4 w-4 text-mkmedia-blue" />
      )}
      <span className="max-w-32 truncate text-sm font-semibold">
        {activeContext.organizationName}
      </span>
      <span className="hidden text-xs text-neutral-500 sm:inline">
        {getAccessLabel(activeContext)}
      </span>
      {!isSingleContext ? <ChevronDown className="h-4 w-4 text-neutral-400" /> : null}
    </Button>
  );

  if (isSingleContext) {
    return compactTrigger;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{compactTrigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-neutral-200 bg-white">
        <DropdownMenuLabel className="flex items-center gap-2 text-neutral-900">
          <CheckCircle2 className="h-4 w-4 text-mkmedia-blue" />
          Contexto organizacional
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={activeContext.contextKey}
          onValueChange={(value) => {
            void handleContextChange(value);
          }}
        >
          {contexts.map((context) => (
            <DropdownMenuRadioItem
              key={context.contextKey}
              value={context.contextKey}
              disabled={isSaving}
              className="items-start py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-neutral-900">
                  {context.organizationName}
                </p>
                <p className="truncate text-xs text-neutral-500">
                  {getAccessLabel(context)}
                </p>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
