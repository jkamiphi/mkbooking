"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountType = "DIRECT_CLIENT" | "AGENCY";

function resolveWorkspaceCopy(accountType: AccountType) {
  if (accountType === "AGENCY") {
    return {
      eyebrow: "Agencia",
      title: "Configura tu agencia",
      description:
        "Tu cuenta opera como agencia. Crea la agencia principal para empezar a gestionar marcas cliente.",
      placeholder: "Ej. Unicornio Azul",
      buttonLabel: "Crear agencia",
      organizationType: "AGENCY" as const,
    };
  }

  return {
    eyebrow: "Cliente directo",
    title: "Configura tu marca",
    description:
      "Tu cuenta opera como cliente directo. Crea tu marca principal para solicitar y operar campañas.",
    placeholder: "Ej. Marca Atlas",
    buttonLabel: "Crear marca",
    organizationType: "DIRECT_CLIENT" as const,
  };
}

export function StarterSetupContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.organization.myContexts.useQuery();
  const [workspaceName, setWorkspaceName] = useState("");

  const createStarterOrganization =
    trpc.organization.createStarterOrganization.useMutation({
      onSuccess: async () => {
        await Promise.all([
          utils.organization.myContexts.invalidate(),
          utils.organization.myOrganizations.invalidate(),
          utils.userProfile.current.invalidate(),
          utils.userProfile.me.invalidate(),
        ]);
        router.push("/profile");
        router.refresh();
      },
    });

  const canSkip = data?.canSkipStarterSetup ?? false;
  const contextCount = data?.contexts.length ?? 0;
  const hasContexts = data?.hasAccessibleContexts ?? false;
  const accountType = (data?.accountType ?? "DIRECT_CLIENT") as AccountType;
  const copy = resolveWorkspaceCopy(accountType);

  function handleCreateWorkspace(event: React.FormEvent) {
    event.preventDefault();

    createStarterOrganization.mutate({
      name: workspaceName.trim(),
      organizationType: copy.organizationType,
    });
  }

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[420px] animate-pulse rounded-md border border-neutral-200/80 bg-white/80" />
        <div className="h-[420px] animate-pulse rounded-md border border-neutral-200/80 bg-white/70" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden rounded-md border-mkmedia-blue/15 bg-white/92 shadow-[0_32px_120px_-54px_rgba(3,89,168,0.28)] backdrop-blur">
        <CardHeader className="space-y-4 border-b border-mkmedia-blue/10 bg-[linear-gradient(180deg,rgba(3,89,168,0.08),rgba(255,255,255,0))] pb-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
            <Sparkles className="h-3.5 w-3.5" />
            Setup inicial
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl text-neutral-950">
              Entra primero. Configura despues.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-neutral-600">
              Ya tienes cuenta activa. Ahora crea el primer espacio operativo
              segun tu tipo de acceso.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <form onSubmit={handleCreateWorkspace} className="space-y-6">
            <div className="rounded-md border border-mkmedia-blue/15 bg-mkmedia-blue/6 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
                {copy.eyebrow}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">
                {copy.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                {copy.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-name">Nombre visible</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder={copy.placeholder}
                required
                className="h-12 rounded-md border-mkmedia-blue/15"
              />
            </div>

            {createStarterOrganization.error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {createStarterOrganization.error.message}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                className="h-11 rounded-md bg-mkmedia-blue px-6 text-white shadow-lg shadow-mkmedia-blue/25 hover:bg-mkmedia-blue/90"
                disabled={
                  createStarterOrganization.isPending ||
                  workspaceName.trim().length === 0
                }
              >
                {createStarterOrganization.isPending
                  ? "Creando espacio..."
                  : copy.buttonLabel}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md border-neutral-300 bg-white"
                onClick={() => {
                  router.push("/profile");
                  router.refresh();
                }}
              >
                {canSkip ? "Ir al perfil" : "Hacerlo despues"}
              </Button>
            </div>
          </form>

          <div className="rounded-md border border-neutral-200/80 bg-neutral-50/80 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-950">
                  {hasContexts
                    ? `Ya tienes ${contextCount} acceso${contextCount === 1 ? "" : "s"} disponible${contextCount === 1 ? "" : "s"}`
                    : "Todavia no tienes espacios activos"}
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  {hasContexts
                    ? "Puedes continuar y operar desde tu contexto activo."
                    : "Cuando completes este paso, tambien podras cambiar de contexto desde perfil."}
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-white/90 px-3 py-2 text-xs text-neutral-700 ring-1 ring-neutral-200/80">
                <Building2 className="h-3.5 w-3.5 text-mkmedia-blue" />
                Contexto operativo por cuenta
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
