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
    value: boolean
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
        <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 rounded">
          {successMessage}
        </div>
      )}

      {/* Account Info */}
      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Información de Cuenta
        </h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Correo electrónico
            </span>
            <p className="text-neutral-900 dark:text-white">
              {profile.user?.email}
            </p>
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
      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Información Personal
          </h2>
          {!isEditing && (
            <button
              onClick={startEditing}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Editar
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                placeholder="+507 6000-0000"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={updateProfile.isPending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
              >
                {updateProfile.isPending ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium rounded-md transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  Nombre
                </span>
                <p className="text-neutral-900 dark:text-white">
                  {profile.firstName || "No establecido"}
                </p>
              </div>
              <div>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  Apellido
                </span>
                <p className="text-neutral-900 dark:text-white">
                  {profile.lastName || "No establecido"}
                </p>
              </div>
            </div>
            <div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                Teléfono
              </span>
              <p className="text-neutral-900 dark:text-white">
                {profile.phone || "No establecido"}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Notification Preferences */}
      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Preferencias de Notificación
        </h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <div>
              <span className="text-neutral-900 dark:text-white font-medium">
                Notificaciones por Correo
              </span>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700"
            />
          </label>
          <label className="flex items-center justify-between">
            <div>
              <span className="text-neutral-900 dark:text-white font-medium">
                Notificaciones por WhatsApp
              </span>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Recibir actualizaciones por WhatsApp
              </p>
            </div>
            <input
              type="checkbox"
              checked={profile.whatsappNotifications}
              onChange={(e) =>
                handleNotificationChange(
                  "whatsappNotifications",
                  e.target.checked
                )
              }
              disabled={updateNotifications.isPending}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700"
            />
          </label>
          <label className="flex items-center justify-between">
            <div>
              <span className="text-neutral-900 dark:text-white font-medium">
                Notificaciones por SMS
              </span>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
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
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700"
            />
          </label>
        </div>
      </section>

      {/* Organizations */}
      {profile.organizationRoles && profile.organizationRoles.length > 0 && (
        <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Organizaciones
          </h2>
          <div className="space-y-3">
            {profile.organizationRoles.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {membership.organization.logoUrl ? (
                    <img
                      src={membership.organization.logoUrl}
                      alt={membership.organization.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {membership.organization.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {membership.organization.name}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      {membership.organization.organizationType}
                    </p>
                  </div>
                </div>
                <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded">
                  {membership.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Locale Settings */}
      <section className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Configuración Regional
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Idioma
            </span>
            <p className="text-neutral-900 dark:text-white">{profile.locale}</p>
          </div>
          <div>
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              Zona horaria
            </span>
            <p className="text-neutral-900 dark:text-white">
              {profile.timezone}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
