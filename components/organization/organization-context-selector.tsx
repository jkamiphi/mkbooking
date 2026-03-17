"use client";

import { Fragment, startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  Link2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type OrganizationContextSelectorProps = {
  variant?: "compact" | "sidebar" | "footer";
  className?: string;
};

type ContextLike = {
  contextKey: string;
  organizationName: string;
  displayCategory:
    | "OWN_BRAND"
    | "OWN_AGENCY"
    | "DELEGATED_BRAND"
    | "DIRECT_ACCESS";
  displayMeta: string;
  accessType: "DIRECT" | "DELEGATED";
  viaOrganizationName: string | null;
};

const CONTEXT_GROUPS = [
  {
    key: "OWN_BRAND",
    title: "Mis marcas",
  },
  {
    key: "OWN_AGENCY",
    title: "Mis agencias",
  },
  {
    key: "DELEGATED_BRAND",
    title: "Accesos por agencia",
  },
  {
    key: "DIRECT_ACCESS",
    title: "Otros accesos",
  },
] as const;

function groupContexts(contexts: ContextLike[]) {
  return CONTEXT_GROUPS.map((group) => ({
    ...group,
    contexts: contexts.filter(
      (context) => context.displayCategory === group.key,
    ),
  })).filter((group) => group.contexts.length > 0);
}

function getTriggerTitle(context: ContextLike) {
  if (context.displayCategory === "OWN_AGENCY") {
    return "Agencia activa";
  }

  if (context.displayCategory === "DELEGATED_BRAND") {
    return "Marca delegada";
  }

  if (context.displayCategory === "DIRECT_ACCESS") {
    return "Acceso compartido";
  }

  return "Marca activa";
}

export function OrganizationContextSelector({
  variant = "compact",
  className,
}: OrganizationContextSelectorProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isSaving, setIsSaving] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrganizationType, setNewOrganizationType] = useState<
    "ADVERTISER" | "AGENCY"
  >("ADVERTISER");
  const [newOrganizationName, setNewOrganizationName] = useState("");
  const { data, isLoading } = trpc.organization.myContexts.useQuery();
  const createStarterOrganization =
    trpc.organization.createStarterOrganization.useMutation({
      onSuccess: async () => {
        await Promise.all([
          utils.organization.myContexts.invalidate(),
          utils.organization.myOrganizations.invalidate(),
          utils.userProfile.current.invalidate(),
          utils.userProfile.me.invalidate(),
        ]);
        setIsCreateDialogOpen(false);
        setNewOrganizationName("");
        toast.success("Negocio creado y disponible en tus accesos.");
        startTransition(() => {
          router.refresh();
        });
      },
      onError: (error) => {
        toast.error("No se pudo crear el negocio", {
          description: error.message,
        });
      },
    });

  const contexts = data?.contexts ?? [];
  const activeContext = data?.activeContext ?? contexts[0] ?? null;
  const groupedContexts = groupContexts(contexts);

  function openCreateDialog(nextType: "ADVERTISER" | "AGENCY") {
    setNewOrganizationType(nextType);
    setNewOrganizationName("");
    setIsCreateDialogOpen(true);
  }

  function handleCreateOrganization() {
    const name = newOrganizationName.trim();
    if (!name) {
      toast.error("Escribe un nombre para el negocio.");
      return;
    }

    createStarterOrganization.mutate({
      name,
      organizationType: newOrganizationType,
    });
  }

  async function handleContextChange(nextContextKey: string) {
    if (
      !activeContext ||
      nextContextKey === activeContext.contextKey ||
      isSaving
    ) {
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
        throw new Error("No se pudo actualizar el acceso activo.");
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
      toast.error("No se pudo cambiar la marca o acceso", {
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
            ? "h-24 animate-pulse rounded-md bg-white/80 ring-1 ring-neutral-200/80"
            : variant === "footer"
              ? "h-14 animate-pulse rounded-md bg-white/80 ring-1 ring-neutral-200/80"
              : "h-10 w-44 animate-pulse rounded-xs border border-neutral-200/80 bg-white/80",
          className,
        )}
      />
    );
  }

  if (!activeContext) {
    return null;
  }

  function renderMenuContent(align: "start" | "end") {
    return (
      <DropdownMenuContent
        align={align}
        className="w-[22rem] rounded-md border-neutral-200 bg-white"
      >
        <DropdownMenuLabel className="flex items-center gap-2 text-neutral-900">
          <CheckCircle2 className="h-4 w-4 text-mkmedia-blue" />
          Marcas y accesos
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={activeContext.contextKey}
          onValueChange={(value) => {
            void handleContextChange(value);
          }}
        >
          {groupedContexts.map((group, groupIndex) => (
            <Fragment key={group.key}>
              {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.16em] text-neutral-500 [font-family:var(--font-mkmedia)]">
                {group.title}
              </DropdownMenuLabel>
              {group.contexts.map((context) => (
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
                      {context.displayMeta}
                    </p>
                  </div>
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => openCreateDialog("ADVERTISER")}
          className="cursor-pointer rounded-xs"
        >
          <Plus className="h-4 w-4 text-mkmedia-blue" />
          Crear marca
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => openCreateDialog("AGENCY")}
          className="cursor-pointer rounded-xs"
        >
          <Plus className="h-4 w-4 text-mkmedia-blue" />
          Crear agencia
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  }

  const createOrganizationDialog = (
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="rounded-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo negocio</DialogTitle>
          <DialogDescription>
            Crea una marca o agencia nueva para operar con otro contexto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={
                  newOrganizationType === "ADVERTISER" ? "default" : "outline"
                }
                className={
                  newOrganizationType === "ADVERTISER"
                    ? "rounded-xs bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                    : "rounded-xs"
                }
                onClick={() => setNewOrganizationType("ADVERTISER")}
              >
                Marca
              </Button>
              <Button
                type="button"
                variant={newOrganizationType === "AGENCY" ? "default" : "outline"}
                className={
                  newOrganizationType === "AGENCY"
                    ? "rounded-xs bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                    : "rounded-xs"
                }
                onClick={() => setNewOrganizationType("AGENCY")}
              >
                Agencia
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-organization-name">Nombre visible</Label>
            <Input
              id="new-organization-name"
              value={newOrganizationName}
              onChange={(event) => setNewOrganizationName(event.target.value)}
              placeholder={
                newOrganizationType === "AGENCY"
                  ? "Ej. MK Media Agency"
                  : "Ej. Marca Atlas"
              }
              className="rounded-xs border-neutral-300"
              disabled={createStarterOrganization.isPending}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-xs"
            onClick={() => {
              setIsCreateDialogOpen(false);
              setNewOrganizationName("");
            }}
            disabled={createStarterOrganization.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="rounded-xs bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
            onClick={handleCreateOrganization}
            disabled={createStarterOrganization.isPending}
          >
            {createStarterOrganization.isPending
              ? "Creando..."
              : "Crear negocio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (variant === "sidebar") {
    const sidebarBody = (
      <>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-mkmedia-blue/[0.08] text-mkmedia-blue ring-1 ring-mkmedia-blue/12">
            <Building2 className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="[font-family:var(--font-mkmedia)] text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
              Marcas y accesos
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-neutral-950">
              {activeContext.organizationName}
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {activeContext.displayMeta}
            </p>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-md bg-neutral-50/80 px-3 py-2 text-xs text-neutral-700 ring-1 ring-neutral-200/80">
          <BriefcaseBusiness className="h-3.5 w-3.5 text-mkmedia-blue" />
          <span className="truncate">{getTriggerTitle(activeContext)}</span>
        </div>
        {activeContext.accessType === "DELEGATED" ? (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-mkmedia-yellow/15 px-3 py-2 text-xs text-neutral-700 ring-1 ring-mkmedia-yellow/35">
            <Link2 className="h-3.5 w-3.5 text-neutral-700" />
            <span className="truncate">
              Operas via {activeContext.viaOrganizationName}
            </span>
          </div>
        ) : null}
      </>
    );

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-full rounded-xs bg-white/88 px-3.5 py-3 text-left ring-1 ring-neutral-200/80 transition hover:bg-white hover:ring-mkmedia-blue/20",
                className,
              )}
              disabled={isSaving}
            >
              {sidebarBody}
            </button>
          </DropdownMenuTrigger>
          {renderMenuContent("start")}
        </DropdownMenu>
        {createOrganizationDialog}
      </>
    );
  }

  if (variant === "footer") {
    const footerTrigger = (
      <button
        type="button"
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-xs bg-white px-3 text-left ring-1 ring-neutral-200/80 transition hover:bg-neutral-50",
          "hover:ring-mkmedia-blue/20",
          className,
        )}
        disabled={isSaving}
      >
        {isSaving ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-mkmedia-blue" />
        ) : (
          <Building2 className="h-4 w-4 text-mkmedia-blue" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-900">
            {activeContext.organizationName}
          </span>
          <span className="block truncate text-xs text-neutral-500">
            {activeContext.displayMeta}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400" />
      </button>
    );

    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{footerTrigger}</DropdownMenuTrigger>
          {renderMenuContent("end")}
        </DropdownMenu>
        {createOrganizationDialog}
      </>
    );
  }

  const compactTrigger = (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        "h-10 rounded-xs border border-neutral-200 bg-white/90 px-3 text-neutral-700 shadow-sm hover:bg-white",
        "hover:border-mkmedia-blue/30",
        className,
      )}
      disabled={isSaving}
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
        {activeContext.displayMeta}
      </span>
      <ChevronDown className="h-4 w-4 text-neutral-400" />
    </Button>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{compactTrigger}</DropdownMenuTrigger>
        {renderMenuContent("end")}
      </DropdownMenu>
      {createOrganizationDialog}
    </>
  );
}
