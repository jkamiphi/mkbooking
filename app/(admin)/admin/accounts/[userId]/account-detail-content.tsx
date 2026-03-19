"use client";

import { useState } from "react";
import type {
  OrganizationRole,
  SystemRole,
  UserAccountType,
} from "@prisma/client";
import {
  Calendar,
  CheckCircle,
  Mail,
  Phone,
  Save,
  Shield,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SelectNative } from "@/components/ui/select-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACCOUNT_TYPE_LABELS,
  getAccountTypeBadgeVariant,
  getSystemRoleBadgeVariant,
  ORGANIZATION_ROLE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  SYSTEM_ROLE_LABELS,
} from "../_lib/account-labels";

interface AccountDetailContentProps {
  userId: string;
}

const organizationRoleOptions: OrganizationRole[] = [
  "OWNER",
  "ADMIN",
  "SALES",
  "OPERATIONS",
  "FINANCE",
  "VIEWER",
  "CLIENT_VIEWER",
];

const systemRoleOptions: SystemRole[] = [
  "CUSTOMER",
  "STAFF",
  "DESIGNER",
  "SALES",
  "OPERATIONS_PRINT",
  "INSTALLER",
  "SUPERADMIN",
];

const accountTypeOptions: UserAccountType[] = ["DIRECT_CLIENT", "AGENCY"];

export function AccountDetailContent({ userId }: AccountDetailContentProps) {
  const utils = trpc.useUtils();
  const { data: me } = trpc.userProfile.me.useQuery();

  const accountQuery = trpc.admin.getAccountDetail.useQuery({ userId });
  const organizationsQuery = trpc.organization.list.useQuery({
    skip: 0,
    take: 300,
  });
  const [selectedAccountType, setSelectedAccountType] =
    useState<UserAccountType | null>(null);
  const [selectedSystemRole, setSelectedSystemRole] =
    useState<SystemRole | null>(null);
  const [membershipOrganizationId, setMembershipOrganizationId] = useState("");
  const [membershipRole, setMembershipRole] =
    useState<OrganizationRole>("ADMIN");
  const [membershipRoleDrafts, setMembershipRoleDrafts] = useState<
    Record<string, OrganizationRole>
  >({});

  async function invalidateAccountViews() {
    await Promise.all([
      utils.admin.getAccountDetail.invalidate({ userId }),
      utils.admin.listAccounts.invalidate(),
      utils.admin.listUsers.invalidate(),
      utils.admin.stats.invalidate(),
    ]);
  }

  const updateAccountType = trpc.admin.updateAccountType.useMutation({
    onSuccess: async () => {
      await invalidateAccountViews();
      toast.success("Tipo de cuenta actualizado.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateSystemRole = trpc.admin.updateSystemRole.useMutation({
    onSuccess: async () => {
      await invalidateAccountViews();
      toast.success("Rol de sistema actualizado.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyUser = trpc.admin.verifyUser.useMutation({
    onSuccess: async () => {
      await invalidateAccountViews();
      toast.success("Usuario verificado.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deactivateUser = trpc.admin.deactivateUser.useMutation({
    onSuccess: async () => {
      await invalidateAccountViews();
      toast.success("Cuenta desactivada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reactivateUser = trpc.admin.reactivateUser.useMutation({
    onSuccess: async () => {
      await invalidateAccountViews();
      toast.success("Cuenta reactivada.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addMembership = trpc.admin.addOrganizationMembership.useMutation({
    onSuccess: async () => {
      await invalidateAccountViews();
      toast.success("Membresía agregada.");
      setMembershipOrganizationId("");
      setMembershipRole("ADMIN");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMembershipRole =
    trpc.admin.updateOrganizationMembershipRole.useMutation({
      onSuccess: async () => {
        await invalidateAccountViews();
        toast.success("Rol de membresía actualizado.");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    });

  const removeMembership = trpc.admin.removeOrganizationMembership.useMutation({
    onSuccess: async () => {
      await invalidateAccountViews();
      toast.success("Membresía removida.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const allOrganizations = organizationsQuery.data?.organizations ?? [];

  const account = accountQuery.data;

  if (accountQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (accountQuery.error || !account) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
        No se pudo cargar el detalle de la cuenta.
      </div>
    );
  }

  const displayName =
    account.firstName && account.lastName
      ? `${account.firstName} ${account.lastName}`
      : account.user.name;

  const canChangeSystemRole = me?.systemRole === "SUPERADMIN";
  const effectiveAccountType = selectedAccountType ?? account.accountType;
  const effectiveSystemRole = selectedSystemRole ?? account.systemRole;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xl font-semibold text-foreground">
              {displayName}
            </p>
            <p className="text-sm text-muted-foreground">
              {account.user.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant={getAccountTypeBadgeVariant(account.accountType)}>
            {ACCOUNT_TYPE_LABELS[account.accountType]}
          </Badge>
          <Badge variant={getSystemRoleBadgeVariant(account.systemRole)}>
            {SYSTEM_ROLE_LABELS[account.systemRole]}
          </Badge>
          <Badge variant={account.isActive ? "success" : "destructive"}>
            {account.isActive ? "Activa" : "Inactiva"}
          </Badge>
          <Badge variant={account.isVerified ? "info" : "secondary"}>
            {account.isVerified ? "Verificada" : "No verificada"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="memberships">Membresías</TabsTrigger>
          <TabsTrigger value="security">Seguridad/Acceso</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos del usuario</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Nombre</Label>
                <p className="text-sm text-foreground">{displayName}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm text-foreground">{account.user.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Teléfono
                </Label>
                <p className="text-sm text-foreground">
                  {account.phone || "-"}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Locale / Zona horaria
                </Label>
                <p className="text-sm text-foreground">
                  {account.locale} / {account.timezone}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Cuenta creada
                </Label>
                <p className="text-sm text-foreground">
                  {new Date(account.createdAt).toLocaleDateString("es-PA")}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">
                  Última actualización
                </Label>
                <p className="text-sm text-foreground">
                  {new Date(account.updatedAt).toLocaleDateString("es-PA")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipo de cuenta operativa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SelectNative
                value={effectiveAccountType}
                onChange={(event) =>
                  setSelectedAccountType(event.target.value as UserAccountType)
                }
              >
                {accountTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {ACCOUNT_TYPE_LABELS[option]}
                  </option>
                ))}
              </SelectNative>
              <Button
                onClick={() =>
                  updateAccountType.mutate({
                    userId,
                    accountType: effectiveAccountType,
                  })
                }
                disabled={
                  updateAccountType.isPending ||
                  effectiveAccountType === account.accountType
                }
              >
                <Save className="mr-2 h-4 w-4" />
                {updateAccountType.isPending
                  ? "Guardando..."
                  : "Guardar tipo de cuenta"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="memberships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agregar membresía</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label className="mb-1.5 block">Organización</Label>
                <SelectNative
                  value={membershipOrganizationId}
                  onChange={(event) =>
                    setMembershipOrganizationId(event.target.value)
                  }
                >
                  <option value="">Selecciona organización</option>
                  {allOrganizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name} (
                      {ORGANIZATION_TYPE_LABELS[organization.organizationType]})
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div>
                <Label className="mb-1.5 block">Rol</Label>
                <SelectNative
                  value={membershipRole}
                  onChange={(event) =>
                    setMembershipRole(event.target.value as OrganizationRole)
                  }
                >
                  {organizationRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {ORGANIZATION_ROLE_LABELS[role]}
                    </option>
                  ))}
                </SelectNative>
              </div>
              <div className="md:col-span-3">
                <Button
                  onClick={() =>
                    addMembership.mutate({
                      userId,
                      organizationId: membershipOrganizationId,
                      role: membershipRole,
                    })
                  }
                  disabled={
                    addMembership.isPending || !membershipOrganizationId
                  }
                >
                  {addMembership.isPending
                    ? "Agregando..."
                    : "Agregar membresía"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Membresías activas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {account.organizationRoles.length > 0 ? (
                account.organizationRoles.map((membership) => (
                  <div
                    key={membership.membershipId}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {membership.organization.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {
                            ORGANIZATION_TYPE_LABELS[
                              membership.organization.organizationType
                            ]
                          }
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <SelectNative
                          value={
                            membershipRoleDrafts[membership.membershipId] ||
                            membership.role
                          }
                          onChange={(event) =>
                            setMembershipRoleDrafts((current) => ({
                              ...current,
                              [membership.membershipId]: event.target
                                .value as OrganizationRole,
                            }))
                          }
                        >
                          {organizationRoleOptions.map((role) => (
                            <option key={role} value={role}>
                              {ORGANIZATION_ROLE_LABELS[role]}
                            </option>
                          ))}
                        </SelectNative>
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateMembershipRole.mutate({
                              membershipId: membership.membershipId,
                              role:
                                membershipRoleDrafts[membership.membershipId] ||
                                membership.role,
                            })
                          }
                          disabled={updateMembershipRole.isPending}
                        >
                          Guardar rol
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() =>
                            removeMembership.mutate({
                              membershipId: membership.membershipId,
                            })
                          }
                          disabled={removeMembership.isPending}
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin membresías activas.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Rol de sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SelectNative
                value={effectiveSystemRole}
                onChange={(event) =>
                  setSelectedSystemRole(event.target.value as SystemRole)
                }
                disabled={!canChangeSystemRole}
              >
                {systemRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {SYSTEM_ROLE_LABELS[role]}
                  </option>
                ))}
              </SelectNative>
              {!canChangeSystemRole ? (
                <p className="text-sm text-muted-foreground">
                  Solo SUPERADMIN puede actualizar el rol de sistema.
                </p>
              ) : null}
              <Button
                onClick={() =>
                  updateSystemRole.mutate({
                    userId,
                    systemRole: effectiveSystemRole,
                  })
                }
                disabled={
                  !canChangeSystemRole ||
                  updateSystemRole.isPending ||
                  effectiveSystemRole === account.systemRole
                }
              >
                {updateSystemRole.isPending
                  ? "Guardando..."
                  : "Guardar rol de sistema"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado y verificaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Estado de cuenta
                </span>
                <span
                  className={`flex items-center gap-1 text-sm ${account.isActive ? "text-emerald-600" : "text-red-600"}`}
                >
                  {account.isActive ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {account.isActive ? "Activa" : "Inactiva"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Perfil verificado
                </span>
                <span
                  className={`flex items-center gap-1 text-sm ${account.isVerified ? "text-emerald-600" : "text-muted-foreground"}`}
                >
                  {account.isVerified ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {account.isVerified ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Email verificado
                </span>
                <span
                  className={`flex items-center gap-1 text-sm ${account.user.emailVerified ? "text-emerald-600" : "text-muted-foreground"}`}
                >
                  {account.user.emailVerified ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {account.user.emailVerified ? "Sí" : "No"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {!account.isVerified ? (
                  <Button
                    variant="outline"
                    onClick={() => verifyUser.mutate({ userId })}
                    disabled={verifyUser.isPending}
                  >
                    <UserCheck className="mr-1 h-4 w-4" />
                    {verifyUser.isPending
                      ? "Verificando..."
                      : "Verificar usuario"}
                  </Button>
                ) : null}

                {account.isActive ? (
                  <Button
                    variant="outline"
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => deactivateUser.mutate({ userId })}
                    disabled={deactivateUser.isPending}
                  >
                    <UserX className="mr-1 h-4 w-4" />
                    {deactivateUser.isPending
                      ? "Desactivando..."
                      : "Desactivar cuenta"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => reactivateUser.mutate({ userId })}
                    disabled={reactivateUser.isPending}
                  >
                    <UserCheck className="mr-1 h-4 w-4" />
                    {reactivateUser.isPending
                      ? "Reactivando..."
                      : "Reactivar cuenta"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metadatos de cuenta</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {account.user.email}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {account.phone || "Sin teléfono"}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Cuenta creada:{" "}
                {new Date(account.user.createdAt).toLocaleDateString("es-PA")}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Perfil actualizado:{" "}
                {new Date(account.updatedAt).toLocaleDateString("es-PA")}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
