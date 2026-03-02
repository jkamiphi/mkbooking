"use client";

import { useMemo, useState } from "react";
import type { SystemRole } from "@prisma/client";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";

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
  DESIGNER: "Diseñador",
  SALES: "Ventas",
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
    () => ["CUSTOMER", "STAFF", "DESIGNER", "SALES", "SUPERADMIN"],
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
        <Plus className="h-4 w-4 mr-2" />
        Crear usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>
            Registrar una nueva cuenta y definir su rol de sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Nombre</Label>
                  <Input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    required
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block">Rol de sistema</Label>
                  <SelectNative
                    value={form.systemRole}
                    onChange={(e) =>
                      updateField("systemRole", e.target.value as SystemRole)
                    }
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role]}
                      </option>
                    ))}
                  </SelectNative>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Primer nombre</Label>
                  <Input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    placeholder="Opcional"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block">Apellido</Label>
                  <Input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  required
                  placeholder="usuario@dominio.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">Contraseña</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    required
                    minLength={8}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block">Confirmar contraseña</Label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) =>
                      updateField("confirmPassword", e.target.value)
                    }
                    required
                    minLength={8}
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </div>
              )}

          <DialogFooter className="pt-2">
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
