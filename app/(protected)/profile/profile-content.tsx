"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

export function ProfileContent() {
  const { data: profile, isLoading, error } = trpc.userProfile.me.useQuery();
  const utils = trpc.useUtils();

  const updateProfile = trpc.userProfile.update.useMutation({
    onSuccess: () => {
      utils.userProfile.me.invalidate();
      setIsEditing(false);
      setSuccessMessage("Perfil actualizado correctamente");
      setTimeout(() => setSuccessMessage(""), 3000);
    },
  });

  const updateNotifications = trpc.userProfile.updateNotifications.useMutation({
    onSuccess: () => {
      utils.userProfile.me.invalidate();
      setSuccessMessage("Preferencias de notificación actualizadas");
      setTimeout(() => setSuccessMessage(""), 3000);
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
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3"></div>
        <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
        <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded">
        Error al cargar el perfil: {error.message}
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 rounded">
        Perfil no encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Account Info */}
      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Información de Cuenta
        </h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-neutral-500">Correo electrónico</span>
            <p className="text-neutral-900">{profile.user?.email}</p>
          </div>
          <div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Nombre
            </span>
            <p className="text-neutral-900 dark:text-white">
              {profile.user?.name || "No establecido"}
            </p>
          </div>
          <div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Miembro desde
            </span>
            <p className="text-neutral-900 dark:text-white">
              {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </section>

      {/* Personal Info */}
      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">
            Información Personal
          </h2>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="rounded-full bg-[#0359A8] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/30 transition hover:bg-[#024a8f]"
            >
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm transition focus:border-[#0359A8] focus:outline-none focus:ring-2 focus:ring-[#0359A8]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-700">
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm transition focus:border-[#0359A8] focus:outline-none focus:ring-2 focus:ring-[#0359A8]/20"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm transition focus:border-[#0359A8] focus:outline-none focus:ring-2 focus:ring-[#0359A8]/20"
                placeholder="+507 6000-0000"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="rounded-full bg-[#0359A8] px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-[#0359A8]/30 transition hover:bg-[#024a8f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateProfile.isPending ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-neutral-200 bg-white px-6 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-neutral-500">Nombre</span>
                <p className="text-neutral-900">
                  {profile.firstName || "No establecido"}
                </p>
              </div>
              <div>
                <span className="text-sm text-neutral-500">Apellido</span>
                <p className="text-neutral-900">
                  {profile.lastName || "No establecido"}
                </p>
              </div>
            </div>
            <div>
              <span className="text-sm text-neutral-500">Teléfono</span>
              <p className="text-neutral-900">
                {profile.phone || "No establecido"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Notification Preferences */}
      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Preferencias de Notificación
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium text-neutral-900">
                Notificaciones por Correo
              </span>
              <p className="text-sm text-neutral-500">
                Recibir actualizaciones por correo
              </p>
            </div>
            <input
              type="checkbox"
              checked={profile.emailNotifications}
              onChange={(e) =>
                handleNotificationChange("emailNotifications", e.target.checked)
              }
              disabled={updateNotifications.isPending}
              className="h-5 w-5 rounded border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]"
            />
          </label>
          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium text-neutral-900">
                Notificaciones por WhatsApp
              </span>
              <p className="text-sm text-neutral-500">
                Recibir actualizaciones por WhatsApp
              </p>
            </div>
            <input
              type="checkbox"
              checked={profile.whatsappNotifications}
              onChange={(e) =>
                handleNotificationChange(
                  "whatsappNotifications",
                  e.target.checked,
                )
              }
              disabled={updateNotifications.isPending}
              className="h-5 w-5 rounded border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]"
            />
          </label>
          <label className="flex items-center justify-between">
            <div>
              <span className="font-medium text-neutral-900">
                Notificaciones por SMS
              </span>
              <p className="text-sm text-neutral-500">
                Recibir actualizaciones por SMS
              </p>
            </div>
            <input
              type="checkbox"
              checked={profile.smsNotifications}
              onChange={(e) =>
                handleNotificationChange("smsNotifications", e.target.checked)
              }
              disabled={updateNotifications.isPending}
              className="h-5 w-5 rounded border-neutral-300 text-[#0359A8] focus:ring-[#0359A8]"
            />
          </label>
        </div>
      </section>

      {/* Organizations */}
      {profile.organizationRoles && profile.organizationRoles.length > 0 && (
        <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">
            Organizaciones
          </h2>
          <div className="space-y-3">
            {profile.organizationRoles.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4"
              >
                <div className="flex items-center gap-3">
                  {membership.organization.logoUrl ? (
                    <img
                      src={membership.organization.logoUrl}
                      alt={membership.organization.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0359A8]/10">
                      <span className="font-semibold text-[#0359A8]">
                        {membership.organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-neutral-900">
                      {membership.organization.name}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {membership.organization.organizationType}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-[#0359A8]/10 px-3 py-1 text-sm font-medium text-[#0359A8]">
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Locale Settings */}
      <section className="rounded-3xl border border-neutral-200 bg-white/90 p-6 shadow-lg backdrop-blur-xl">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Configuración Regional
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-neutral-500">Idioma</span>
            <p className="text-neutral-900">{profile.locale}</p>
          </div>
          <div>
            <span className="text-sm text-neutral-500">Zona horaria</span>
            <p className="text-neutral-900">{profile.timezone}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
