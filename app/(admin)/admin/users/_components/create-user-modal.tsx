"use client";

import { useMemo, useState } from "react";
import type { SystemRole } from "@prisma/client";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

interface CreateUserModalProps {
  onCreated?: () => void;
}

interface CreateUserFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  systemRole: SystemRole;
}

const defaultFormState: CreateUserFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  systemRole: "CUSTOMER",
};

const roleLabels: Record<SystemRole, string> = {
  CUSTOMER: "Cliente",
  STAFF: "Staff",
  SUPERADMIN: "Superadmin",
};

export function CreateUserModal({ onCreated }: CreateUserModalProps) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.userProfile.me.useQuery();

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateUserFormState>(defaultFormState);

  const createUser = trpc.admin.createUser.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.listUsers.invalidate(),
        utils.admin.stats.invalidate(),
      ]);
      setIsOpen(false);
      setError(null);
      setForm(defaultFormState);
      onCreated?.();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const canCreateUsers = me?.systemRole === "SUPERADMIN";
  const availableRoles = useMemo<SystemRole[]>(
    () => ["CUSTOMER", "STAFF", "SUPERADMIN"],
    []
  );

  function updateField<K extends keyof CreateUserFormState>(
    field: K,
    value: CreateUserFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function closeModal() {
    if (createUser.isPending) {
      return;
    }
    setIsOpen(false);
    setError(null);
    setForm(defaultFormState);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    createUser.mutate({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      name: form.name.trim(),
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      systemRole: form.systemRole,
    });
  }

  if (!canCreateUsers) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Crear usuario
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-lg shadow-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Crear usuario
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={createUser.isPending}
                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                aria-label="Cerrar modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Rol de sistema
                  </label>
                  <select
                    value={form.systemRole}
                    onChange={(e) =>
                      updateField("systemRole", e.target.value as SystemRole)
                    }
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Primer nombre
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                  placeholder="usuario@dominio.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      updateField("confirmPassword", e.target.value)
                    }
                    required
                    minLength={8}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-800 dark:text-white"
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeModal}
                  disabled={createUser.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? "Creando..." : "Crear usuario"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
