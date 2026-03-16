"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
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

type StarterType = "ADVERTISER" | "AGENCY";

const STARTER_OPTIONS: Array<{
  type: StarterType;
  title: string;
  description: string;
  eyebrow: string;
}> = [
  {
    type: "ADVERTISER",
    title: "Crear mi marca",
    description:
      "Configura un espacio minimo para cotizar, solicitar y operar como anunciante.",
    eyebrow: "Marca / anunciante",
  },
  {
    type: "AGENCY",
    title: "Crear mi agencia",
    description:
      "Prepara tu cuenta para operar clientes y centralizar marcas desde una agencia.",
    eyebrow: "Agencia",
  },
];

export function StarterSetupContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.organization.myContexts.useQuery();
  const [selectedType, setSelectedType] = useState<StarterType | null>(null);
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

  const selectedOption = useMemo(
    () =>
      STARTER_OPTIONS.find((option) => option.type === selectedType) ?? null,
    [selectedType],
  );

  function handleCreateWorkspace(event: React.FormEvent) {
    event.preventDefault();

    if (!selectedType) {
      return;
    }

    createStarterOrganization.mutate({
      name: workspaceName.trim(),
      organizationType: selectedType,
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
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-mkmedia-blue/20 bg-mkmedia-blue/8 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
            <Sparkles className="h-3.5 w-3.5" />
            Setup inicial
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl text-neutral-950">
              Entra primero. Configura despues.
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 text-neutral-600">
              Tu cuenta ya esta lista. Si necesitas operar de inmediato, crea
              una marca o una agencia con solo un nombre. Si ya te compartieron
              accesos, podras usarlos sin completar datos comerciales ahora.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {!selectedOption ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {STARTER_OPTIONS.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => {
                      setSelectedType(option.type);
                      setWorkspaceName("");
                    }}
                    className="rounded-md border border-neutral-200/80 bg-white p-5 text-left transition hover:border-mkmedia-blue/30 hover:bg-mkmedia-blue/[0.04]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
                      {option.eyebrow}
                    </p>
                    <h2 className="mt-3 text-xl font-semibold text-neutral-950">
                      {option.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {option.description}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-mkmedia-blue">
                      Empezar
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-md border border-neutral-200/80 bg-neutral-50/80 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-950">
                      {hasContexts
                        ? `Ya tienes ${contextCount} acceso${contextCount === 1 ? "" : "s"} disponible${contextCount === 1 ? "" : "s"}`
                        : "Todavia no tienes una marca o agencia creada"}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {hasContexts
                        ? "Puedes saltarte este paso y entrar directo a tu espacio activo."
                        : "Puedes continuar y decidir mas tarde. Cuando quieras, podras crear tu primer espacio desde el perfil."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full border-neutral-300 bg-white"
                      onClick={() => {
                        router.push("/profile");
                        router.refresh();
                      }}
                    >
                      {canSkip ? "Ir al perfil" : "Continuar sin crear"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <button
                type="button"
                onClick={() => setSelectedType(null)}
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver
              </button>

              <div className="rounded-md border border-mkmedia-blue/15 bg-mkmedia-blue/6 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mkmedia-blue [font-family:var(--font-mkmedia)]">
                  {selectedOption.eyebrow}
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-neutral-950">
                  {selectedOption.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Solo necesitamos un nombre visible para crear el espacio
                  inicial. Los datos fiscales, legales y de facturacion quedan
                  para despues.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-name">Nombre visible</Label>
                <Input
                  id="workspace-name"
                  value={workspaceName}
                  onChange={(event) => setWorkspaceName(event.target.value)}
                  placeholder={
                    selectedType === "AGENCY"
                      ? "Ej. MK Media Agency"
                      : "Ej. Marca Atlas"
                  }
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
                  className="h-11 rounded-full bg-mkmedia-blue px-6 text-white shadow-lg shadow-mkmedia-blue/25 hover:bg-mkmedia-blue/90"
                  disabled={
                    createStarterOrganization.isPending ||
                    workspaceName.trim().length === 0
                  }
                >
                  {createStarterOrganization.isPending
                    ? "Creando espacio..."
                    : "Crear y continuar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-full border-neutral-300 bg-white"
                  onClick={() => {
                    router.push("/profile");
                    router.refresh();
                  }}
                >
                  Hacerlo despues
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
