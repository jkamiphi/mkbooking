import type {
  OrganizationRelationshipStatus,
  OrganizationRole,
  OrganizationType,
  SystemRole,
  UserAccountType,
} from "@prisma/client";

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  CUSTOMER: "Cliente",
  STAFF: "Staff",
  DESIGNER: "Diseñador",
  SALES: "Ventas",
  OPERATIONS_PRINT: "Impresión",
  INSTALLER: "Instalador",
  SUPERADMIN: "Superadmin",
};

export const ACCOUNT_TYPE_LABELS: Record<UserAccountType, string> = {
  DIRECT_CLIENT: "Cliente directo",
  AGENCY: "Agencia",
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  DIRECT_CLIENT: "Cliente directo",
  AGENCY: "Agencia",
  MEDIA_OWNER: "Dueño de medios",
  PLATFORM_ADMIN: "Admin plataforma",
};

export const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  SALES: "Ventas",
  OPERATIONS: "Operaciones",
  FINANCE: "Finanzas",
  VIEWER: "Lector",
  CLIENT_VIEWER: "Lector cliente",
};

export const RELATIONSHIP_STATUS_LABELS: Record<
  OrganizationRelationshipStatus,
  string
> = {
  PENDING: "Pendiente",
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
};

export function getSystemRoleBadgeVariant(role: SystemRole) {
  if (role === "SUPERADMIN") return "destructive" as const;
  if (role === "STAFF") return "info" as const;
  if (role === "DESIGNER" || role === "SALES") return "warning" as const;
  if (role === "OPERATIONS_PRINT" || role === "INSTALLER") return "secondary" as const;
  return "outline" as const;
}

export function getAccountTypeBadgeVariant(type: UserAccountType) {
  return type === "AGENCY" ? ("info" as const) : ("secondary" as const);
}

export function getRelationshipStatusBadgeVariant(
  status: OrganizationRelationshipStatus,
) {
  if (status === "ACTIVE") return "success" as const;
  if (status === "PENDING") return "warning" as const;
  return "secondary" as const;
}
