"use client";

import { useState } from "react";
import {
  Bell,
  Building2,
  Check,
  Globe,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Smartphone,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

/* ── Toggle Switch ─────────────────────────────────────── */

function ToggleSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0359A8]/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-[#0359A8]" : "bg-neutral-200"
        }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0.5"
          }`}
      />
    </button>
  );
}

/* ── Section Card ──────────────────────────────────────── */

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white p-5 ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="text-sm font-semibold text-neutral-900">{children}</h2>
    </div>
  );
}

/* ── Field Display ─────────────────────────────────────── */

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-neutral-900">
        {value || <span className="text-neutral-300">—</span>}
      </dd>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */

export function ProfileContent() {
  const { data: profile, isLoading, error } = trpc.userProfile.me.useQuery();
  const utils = trpc.useUtils();

  const updateProfile = trpc.userProfile.update.useMutation({
    onSuccess: () => {
      utils.userProfile.me.invalidate();
      setIsEditing(false);
      setSuccessMessage("Perfil actualizado");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const updateNotifications = trpc.userProfile.updateNotifications.useMutation({
    onSuccess: () => {
      utils.userProfile.me.invalidate();
    },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function startEditing() {
    setFirstName(profile?.firstName || "");
    setLastName(profile?.lastName || "");
    setPhone(profile?.phone || "");
    setIsEditing(true);
  }

  function handleSave() {
    updateProfile.mutate({
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      phone: phone || undefined,
    });
  }

  function handleNotificationChange(
    key: "emailNotifications" | "whatsappNotifications" | "smsNotifications",
    value: boolean,
  ) {
    updateNotifications.mutate({ [key]: value });
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl bg-neutral-100"
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
        Perfil no encontrado
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-200 bg-neutral-50/50 px-3.5 py-2.5 text-sm transition placeholder:text-neutral-400 focus:border-[#0359A8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0359A8]/15";

  return (
    <div className="space-y-5">
      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Account info */}
      <SectionCard>
        <SectionTitle icon={Mail}>Cuenta</SectionTitle>
        <dl className="divide-y divide-neutral-100">
          <FieldRow label="Correo electrónico" value={profile.user?.email} />
          <FieldRow label="Nombre de cuenta" value={profile.user?.name} />
          <FieldRow
            label="Miembro desde"
            value={new Date(profile.createdAt).toLocaleDateString("es-PA", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          />
        </dl>
      </SectionCard>

      {/* Personal info */}
      <SectionCard>
        <div className="mb-4 flex items-center justify-between">
          <SectionTitle icon={Phone}>Información personal</SectionTitle>
          {!isEditing && (
            <button
              type="button"
              onClick={startEditing}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
            >
              <Pencil className="h-3 w-3" />
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Tu apellido"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+507 6000-0000"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0359A8] px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-[#0359A8]/20 transition hover:bg-[#024a8f] disabled:opacity-50"
              >
                {updateProfile.isPending ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                <X className="h-3 w-3" />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <dl className="divide-y divide-neutral-100">
            <FieldRow label="Nombre" value={profile.firstName} />
            <FieldRow label="Apellido" value={profile.lastName} />
            <FieldRow label="Teléfono" value={profile.phone} />
          </dl>
        )}
      </SectionCard>

      {/* Notifications */}
      <SectionCard>
        <SectionTitle icon={Bell}>Notificaciones</SectionTitle>
        <div className="space-y-0 divide-y divide-neutral-100">
          <label className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-50">
                <Mail className="h-4 w-4 text-neutral-500" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Correo electrónico
                </p>
                <p className="text-xs text-neutral-500">
                  Actualizaciones por email
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={profile.emailNotifications}
              disabled={updateNotifications.isPending}
              onChange={(v) => handleNotificationChange("emailNotifications", v)}
            />
          </label>

          <label className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-50">
                <MessageCircle className="h-4 w-4 text-neutral-500" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  WhatsApp
                </p>
                <p className="text-xs text-neutral-500">
                  Notificaciones por WhatsApp
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={profile.whatsappNotifications}
              disabled={updateNotifications.isPending}
              onChange={(v) =>
                handleNotificationChange("whatsappNotifications", v)
              }
            />
          </label>

          <label className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-50">
                <Smartphone className="h-4 w-4 text-neutral-500" />
              </span>
              <div>
                <p className="text-sm font-medium text-neutral-900">SMS</p>
                <p className="text-xs text-neutral-500">
                  Mensajes de texto
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={profile.smsNotifications}
              disabled={updateNotifications.isPending}
              onChange={(v) =>
                handleNotificationChange("smsNotifications", v)
              }
            />
          </label>
        </div>
      </SectionCard>

      {/* Organizations */}
      {profile.organizationRoles && profile.organizationRoles.length > 0 && (
        <SectionCard>
          <SectionTitle icon={Building2}>Organizaciones</SectionTitle>
          <div className="space-y-2">
            {profile.organizationRoles.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {membership.organization.logoUrl ? (
                    <img
                      src={membership.organization.logoUrl}
                      alt={membership.organization.name}
                      className="h-9 w-9 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0359A8]/8 text-sm font-bold text-[#0359A8]">
                      {membership.organization.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-neutral-900">
                      {membership.organization.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {membership.organization.organizationType}
                    </p>
                  </div>
                </div>
                <span className="rounded-md bg-[#0359A8]/8 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0359A8]">
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Locale */}
      <SectionCard>
        <SectionTitle icon={Globe}>Configuración regional</SectionTitle>
        <dl className="divide-y divide-neutral-100">
          <FieldRow label="Idioma" value={profile.locale} />
          <FieldRow label="Zona horaria" value={profile.timezone} />
        </dl>
      </SectionCard>
    </div>
  );
}
