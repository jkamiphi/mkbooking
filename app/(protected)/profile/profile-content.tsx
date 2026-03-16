"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  Link2,
  LoaderCircle,
  Mail,
  PencilLine,
  Phone,
  Save,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const NOTIFICATION_ROWS = [
  {
    type: "ORDER_CONFIRMED",
    label: "Orden confirmada",
    description:
      "Cuando MK Booking confirma la orden y arranca el flujo interno.",
  },
  {
    type: "SALES_REVIEW_APPROVED",
    label: "Validación comercial aprobada",
    description: "Cuando Ventas aprueba la revisión comercial.",
  },
  {
    type: "SALES_REVIEW_CHANGES_REQUESTED",
    label: "Cambios solicitados por Ventas",
    description: "Cuando Ventas pide ajustes antes de continuar.",
  },
  {
    type: "DESIGN_PROOF_PUBLISHED",
    label: "Nueva prueba de diseño",
    description: "Cuando diseño publica una nueva prueba para revisión.",
  },
  {
    type: "DESIGN_RESPONSE_APPROVED",
    label: "Diseño aprobado",
    description: "Cuando una prueba queda aprobada por diseño o cliente.",
  },
  {
    type: "DESIGN_RESPONSE_CHANGES_REQUESTED",
    label: "Cambios de diseño solicitados",
    description: "Cuando diseño o cliente pide ajustes en la prueba.",
  },
  {
    type: "PRINT_STARTED",
    label: "Impresión iniciada",
    description: "Cuando la producción final entra en ejecución.",
  },
  {
    type: "PRINT_COMPLETED",
    label: "Impresión completada",
    description: "Cuando la impresión final queda confirmada.",
  },
  {
    type: "INSTALLATION_SUBMITTED",
    label: "Instalación enviada a revisión",
    description: "Cuando el instalador entrega la instalación a Ops.",
  },
  {
    type: "INSTALLATION_REPORT_ISSUED",
    label: "Reporte de instalación emitido",
    description: "Cuando Ops valida la instalación y emite el reporte final.",
  },
] as const;

type NotificationType = (typeof NOTIFICATION_ROWS)[number]["type"];

type NotificationDraft = Record<
  NotificationType,
  {
    emailEnabled: boolean;
    inAppEnabled: boolean;
  }
>;

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function createEmptyNotificationDraft(): NotificationDraft {
  return Object.fromEntries(
    NOTIFICATION_ROWS.map((row) => [
      row.type,
      {
        emailEnabled: true,
        inAppEnabled: true,
      },
    ]),
  ) as NotificationDraft;
}

function buildNotificationDraft(
  preferences:
    | Array<{
        type: string;
        emailEnabled: boolean;
        inAppEnabled: boolean;
      }>
    | undefined,
) {
  const nextDraft = createEmptyNotificationDraft();

  for (const preference of preferences ?? []) {
    if (preference.type in nextDraft) {
      nextDraft[preference.type as NotificationType] = {
        emailEnabled: preference.emailEnabled,
        inAppEnabled: preference.inAppEnabled,
      };
    }
  }

  return nextDraft;
}

function buildPersonalDraft(profile: {
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
}) {
  return {
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    phone: profile.phone ?? "",
  };
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-neutral-200/70 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <dt className="text-sm font-medium text-neutral-500">{label}</dt>
      <dd className="max-w-[18rem] text-right text-sm text-neutral-900">
        {value?.trim() ? (
          value
        ) : (
          <span className="text-neutral-400">Sin registrar</span>
        )}
      </dd>
    </div>
  );
}

type ProfileOrganizationContext = {
  contextKey: string;
  organizationName: string;
  organizationType: string;
  accessType: "DIRECT" | "DELEGATED";
  viaOrganizationName: string | null;
  role: string;
  displayCategory:
    | "OWN_BRAND"
    | "OWN_AGENCY"
    | "DELEGATED_BRAND"
    | "DIRECT_ACCESS";
  displayMeta: string;
};

const CONTEXT_SECTION_CONFIG = [
  {
    key: "OWN_BRAND",
    title: "Mis marcas",
    description: "Espacios propios como anunciante.",
  },
  {
    key: "OWN_AGENCY",
    title: "Mis agencias",
    description: "Agencias propias que administras directamente.",
  },
  {
    key: "DELEGATED_BRAND",
    title: "Accesos por agencia",
    description: "Marcas cliente a las que llegas via una agencia.",
  },
  {
    key: "DIRECT_ACCESS",
    title: "Accesos compartidos",
    description:
      "Organizaciones directas que no son tuyas pero comparten acceso.",
  },
] as const;

function ContextTone({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "accent";
}) {
  return (
    <span
      className={
        variant === "accent"
          ? "rounded-md bg-mkmedia-blue/8 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-mkmedia-blue"
          : "rounded-md bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600"
      }
    >
      {children}
    </span>
  );
}

function formatOrganizationTypeLabel(value: string) {
  if (value === "ADVERTISER") {
    return "Marca";
  }

  if (value === "AGENCY") {
    return "Agencia";
  }

  if (value === "MEDIA_OWNER") {
    return "Media owner";
  }

  return value;
}

function WorkspaceCard({
  context,
  isActive,
  isSaving,
  onSelect,
}: {
  context: ProfileOrganizationContext;
  isActive: boolean;
  isSaving: boolean;
  onSelect: (contextKey: string) => void;
}) {
  return (
    <div
      className={
        isActive
          ? "rounded-md border border-mkmedia-blue/20 bg-mkmedia-blue/6 px-4 py-4"
          : "rounded-md border border-neutral-200/80 bg-neutral-50/80 px-4 py-4"
      }
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-neutral-950">
              {context.organizationName}
            </p>
            <ContextTone>
              {formatOrganizationTypeLabel(context.organizationType)}
            </ContextTone>
            <ContextTone variant="accent">{context.displayMeta}</ContextTone>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span>{context.role}</span>
            {context.accessType === "DELEGATED" ? (
              <span className="inline-flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Via {context.viaOrganizationName}
              </span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          variant={isActive ? "outline" : "default"}
          className={
            isActive
              ? "rounded-md border-mkmedia-blue/20 bg-white text-mkmedia-blue hover:bg-white"
              : "rounded-md bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
          }
          onClick={() => onSelect(context.contextKey)}
          disabled={isSaving || isActive}
        >
          {isSaving ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : isActive ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : null}
          {isActive ? "Activa" : "Operar aqui"}
        </Button>
      </div>
    </div>
  );
}

export function ProfileContent() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: profile, isLoading, error } = trpc.userProfile.me.useQuery();

  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [switchingContextKey, setSwitchingContextKey] = useState<string | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [personalDraft, setPersonalDraft] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [notificationDraft, setNotificationDraft] =
    useState<NotificationDraft | null>(null);

  const updateProfile = trpc.userProfile.update.useMutation({
    onSuccess: async () => {
      await utils.userProfile.me.invalidate();
      setIsEditingPersonal(false);
      setSuccessMessage("La información personal fue actualizada.");
    },
  });

  const updateNotificationPreferences =
    trpc.userProfile.updateNotificationPreferences.useMutation({
      onSuccess: async () => {
        await utils.userProfile.me.invalidate();
        setNotificationDraft(null);
        setSuccessMessage(
          "Las preferencias de notificación fueron actualizadas.",
        );
      },
    });

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-36 animate-pulse rounded-3xl border border-neutral-200/70 bg-white/80"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Error al cargar el perfil: {error.message}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Perfil no encontrado.
      </div>
    );
  }

  const currentProfile = profile;
  const effectiveNotificationDraft =
    notificationDraft ??
    buildNotificationDraft(currentProfile.notificationPreferences);

  const hasNotificationChanges = NOTIFICATION_ROWS.some((row) => {
    const serverPreference = currentProfile.notificationPreferences.find(
      (preference) => preference.type === row.type,
    );
    const draftPreference = effectiveNotificationDraft[row.type];

    return (
      (serverPreference?.emailEnabled ?? true) !==
        draftPreference.emailEnabled ||
      (serverPreference?.inAppEnabled ?? true) !== draftPreference.inAppEnabled
    );
  });

  const groupedContexts = CONTEXT_SECTION_CONFIG.map((section) => ({
    ...section,
    contexts: currentProfile.organizationContexts.filter(
      (context) => context.displayCategory === section.key,
    ),
  })).filter((section) => section.contexts.length > 0);

  function handlePersonalDraftChange(
    field: keyof typeof personalDraft,
    value: string,
  ) {
    setPersonalDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleNotificationToggle(
    type: NotificationType,
    field: "emailEnabled" | "inAppEnabled",
    value: boolean,
  ) {
    setNotificationDraft((current) => {
      const baseDraft =
        current ??
        buildNotificationDraft(currentProfile.notificationPreferences);

      return {
        ...baseDraft,
        [type]: {
          ...baseDraft[type],
          [field]: value,
        },
      };
    });
  }

  function handlePersonalEditStart() {
    setPersonalDraft(buildPersonalDraft(currentProfile));
    setIsEditingPersonal(true);
  }

  function handlePersonalEditCancel() {
    setPersonalDraft(buildPersonalDraft(currentProfile));
    setIsEditingPersonal(false);
  }

  function handlePersonalSave() {
    updateProfile.mutate({
      firstName: personalDraft.firstName.trim() || undefined,
      lastName: personalDraft.lastName.trim() || undefined,
      phone: personalDraft.phone.trim() || undefined,
    });
  }

  function handleNotificationSave() {
    updateNotificationPreferences.mutate({
      preferences: NOTIFICATION_ROWS.map((row) => ({
        type: row.type,
        emailEnabled: effectiveNotificationDraft[row.type].emailEnabled,
        inAppEnabled: effectiveNotificationDraft[row.type].inAppEnabled,
      })),
    });
  }

  async function handleContextSwitch(nextContextKey: string) {
    if (
      switchingContextKey ||
      nextContextKey === currentProfile.activeOrganizationContext?.contextKey
    ) {
      return;
    }

    setSwitchingContextKey(nextContextKey);

    try {
      const response = await fetch("/api/organization-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contextKey: nextContextKey }),
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar la organizacion activa.");
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
    } catch (contextError) {
      toast.error("No se pudo cambiar la marca o acceso", {
        description:
          contextError instanceof Error
            ? contextError.message
            : "Intenta de nuevo en unos segundos.",
      });
    } finally {
      setSwitchingContextKey(null);
    }
  }

  return (
    <div className="space-y-5">
      {successMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)]">
        <Card className="overflow-hidden rounded-3xl border-neutral-200/80 bg-white shadow-[0_24px_60px_-38px_rgba(3,89,168,0.28)]">
          <CardHeader className="border-b border-neutral-200/70 bg-[linear-gradient(180deg,rgba(3,89,168,0.08),rgba(255,255,255,0))]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-sm shadow-[#0359A8]/25">
                <UserRound className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Mi cuenta</CardTitle>
                <CardDescription>
                  Datos base del usuario y acceso principal.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <dl className="space-y-0">
              <FieldRow
                label="Correo electrónico"
                value={currentProfile.user.email}
              />
              <FieldRow
                label="Miembro desde"
                value={formatDate(currentProfile.createdAt)}
              />
            </dl>

            {currentProfile.activeOrganizationContext ? (
              <div className="rounded-[1.75rem] border border-mkmedia-blue/15 bg-mkmedia-blue/6 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-900">
                  <Check className="h-4 w-4 text-mkmedia-blue" />
                  Organizacion activa
                </div>
                <p className="mt-3 text-base font-semibold text-neutral-950">
                  {currentProfile.activeOrganizationContext.organizationName}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <ContextTone>
                    {formatOrganizationTypeLabel(
                      currentProfile.activeOrganizationContext.organizationType,
                    )}
                  </ContextTone>
                  <ContextTone variant="accent">
                    {currentProfile.activeOrganizationContext.displayMeta}
                  </ContextTone>
                </div>
                {currentProfile.activeOrganizationContext.accessType ===
                "DELEGATED" ? (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-600">
                    <Link2 className="h-3 w-3" />
                    Via{" "}
                    {
                      currentProfile.activeOrganizationContext
                        .viaOrganizationName
                    }
                  </p>
                ) : null}
                <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                  <BriefcaseBusiness className="h-3.5 w-3.5 text-mkmedia-blue" />
                  Cambiar esta seleccion afecta solicitudes, ordenes y pricing.
                </div>
              </div>
            ) : null}

            {currentProfile.organizationContexts.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <Building2 className="h-4 w-4 text-mkmedia-blue" />
                  Marcas y accesos
                </div>
                <div className="space-y-4">
                  {groupedContexts.map((section) => (
                    <div key={section.key} className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-950">
                          {section.title}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {section.description}
                        </p>
                      </div>
                      <div className="space-y-3">
                        {section.contexts.map((context) => (
                          <WorkspaceCard
                            key={context.contextKey}
                            context={context}
                            isActive={
                              context.contextKey ===
                              currentProfile.activeOrganizationContext
                                ?.contextKey
                            }
                            isSaving={
                              switchingContextKey === context.contextKey
                            }
                            onSelect={handleContextSwitch}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-neutral-300 bg-neutral-50/80 px-5 py-5">
                <p className="text-sm font-semibold text-neutral-950">
                  Todavia no tienes marcas ni accesos visibles
                </p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  Crea tu primer espacio o vuelve al setup inicial. Si una
                  agencia o empresa te comparte acceso, tambien aparecera aqui.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    asChild
                    className="rounded-md bg-mkmedia-blue text-white hover:bg-mkmedia-blue/90"
                  >
                    <Link href="/onboarding">Crear mi primer espacio</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-md bg-white"
                  >
                    <Link href="/">Explorar catalogo</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-neutral-200/80 bg-white shadow-[0_24px_60px_-38px_rgba(15,23,42,0.2)]">
          <CardHeader className="border-b border-neutral-200/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-900 text-white">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <CardTitle>Información personal</CardTitle>
                  <CardDescription>
                    Nombre, apellido y teléfono de contacto.
                  </CardDescription>
                </div>
              </div>

              {!isEditingPersonal ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePersonalEditStart}
                  className="rounded-md"
                >
                  <PencilLine className="h-4 w-4" />
                  Editar
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isEditingPersonal ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Nombre
                    </label>
                    <Input
                      value={personalDraft.firstName}
                      onChange={(event) =>
                        handlePersonalDraftChange(
                          "firstName",
                          event.target.value,
                        )
                      }
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">
                      Apellido
                    </label>
                    <Input
                      value={personalDraft.lastName}
                      onChange={(event) =>
                        handlePersonalDraftChange(
                          "lastName",
                          event.target.value,
                        )
                      }
                      placeholder="Tu apellido"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-700">
                    Teléfono
                  </label>
                  <Input
                    value={personalDraft.phone}
                    onChange={(event) =>
                      handlePersonalDraftChange("phone", event.target.value)
                    }
                    placeholder="+507 6000-0000"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button
                    type="button"
                    onClick={handlePersonalSave}
                    disabled={updateProfile.isPending}
                    className="rounded-md bg-[#0359A8] text-white hover:bg-[#024a8f]"
                  >
                    <Save className="h-4 w-4" />
                    {updateProfile.isPending
                      ? "Guardando..."
                      : "Guardar cambios"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePersonalEditCancel}
                    disabled={updateProfile.isPending}
                    className="rounded-md"
                  >
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <dl className="space-y-0">
                <FieldRow label="Nombre" value={currentProfile.firstName} />
                <FieldRow label="Apellido" value={currentProfile.lastName} />
                <FieldRow label="Teléfono" value={currentProfile.phone} />
              </dl>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-neutral-200/80 bg-white shadow-[0_24px_60px_-38px_rgba(3,89,168,0.18)]">
        <CardHeader className="border-b border-neutral-200/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0359A8] text-white shadow-sm shadow-[#0359A8]/25">
                <Bell className="h-5 w-5" />
              </span>
              <div>
                <CardTitle>Preferencias de notificación</CardTitle>
                <CardDescription>
                  Elige qué hitos quieres recibir por correo y cuáles mantener
                  en tu bandeja in-app.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleNotificationSave}
              disabled={
                !hasNotificationChanges ||
                updateNotificationPreferences.isPending
              }
              className="rounded-md bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <Save className="h-4 w-4" />
              {updateNotificationPreferences.isPending
                ? "Guardando..."
                : "Guardar preferencias"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="hidden grid-cols-[minmax(0,1fr)_88px_88px] items-center gap-4 border-b border-neutral-200/70 px-4 pb-3 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500 md:grid">
            <span>Evento</span>
            <span className="text-center">Correo</span>
            <span className="text-center">In-app</span>
          </div>

          <div className="divide-y divide-neutral-200/70">
            {NOTIFICATION_ROWS.map((row) => (
              <div
                key={row.type}
                className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_88px_88px] md:items-center"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    {row.label}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {row.description}
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/70 px-3 py-2 md:justify-center md:border-0 md:bg-transparent md:px-0 md:py-0">
                  <span className="text-xs font-medium text-neutral-500 md:hidden">
                    Correo
                  </span>
                  <Checkbox
                    checked={effectiveNotificationDraft[row.type].emailEnabled}
                    onCheckedChange={(value) =>
                      handleNotificationToggle(
                        row.type,
                        "emailEnabled",
                        value === true,
                      )
                    }
                    disabled={updateNotificationPreferences.isPending}
                    aria-label={`Recibir ${row.label} por correo`}
                    className="h-5 w-5 rounded-md border-neutral-300 data-[state=checked]:border-[#0359A8] data-[state=checked]:bg-[#0359A8]"
                  />
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-neutral-200/70 bg-neutral-50/70 px-3 py-2 md:justify-center md:border-0 md:bg-transparent md:px-0 md:py-0">
                  <span className="text-xs font-medium text-neutral-500 md:hidden">
                    In-app
                  </span>
                  <Checkbox
                    checked={effectiveNotificationDraft[row.type].inAppEnabled}
                    onCheckedChange={(value) =>
                      handleNotificationToggle(
                        row.type,
                        "inAppEnabled",
                        value === true,
                      )
                    }
                    disabled={updateNotificationPreferences.isPending}
                    aria-label={`Recibir ${row.label} en la bandeja in-app`}
                    className="h-5 w-5 rounded-md border-neutral-300 data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-900"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                El correo de cuenta se mantiene como referencia y no es editable
                desde esta pantalla.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
