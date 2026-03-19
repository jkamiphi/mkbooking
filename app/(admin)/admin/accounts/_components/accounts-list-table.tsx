"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  MoreHorizontal,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import type {
  LegalEntityType,
  OrganizationRole,
  OrganizationType,
  SystemRole,
  UserAccountType,
} from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ACCOUNT_TYPE_LABELS,
  getAccountTypeBadgeVariant,
  getSystemRoleBadgeVariant,
  ORGANIZATION_TYPE_LABELS,
  SYSTEM_ROLE_LABELS,
} from "../_lib/account-labels";

interface AccountsListTableProps {
  accounts: Array<{
    id: string;
    userId: string;
    accountType: UserAccountType;
    systemRole: SystemRole;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date;
    displayName: string;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
      emailVerified: boolean;
    };
    relationshipSummary: {
      total: number;
      active: number;
      pending: number;
      inactive: number;
    };
    organizationRoles: Array<{
      membershipId: string;
      role: OrganizationRole;
      isActive: boolean;
      acceptedAt: Date | null;
      organization: {
        id: string;
        name: string;
        organizationType: OrganizationType;
        legalEntityType: LegalEntityType;
        isActive: boolean;
        isVerified: boolean;
      };
    }>;
  }>;
  total: number;
  isLoading: boolean;
  isFetching: boolean;
  error?: string;
  onRetry: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString("es-PA");
  }
  if (diffDays > 0) {
    return `${diffDays} día${diffDays === 1 ? "" : "s"}`;
  }
  if (diffHours > 0) {
    return `${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  }
  if (diffMins > 0) {
    return `${diffMins} minuto${diffMins === 1 ? "" : "s"}`;
  }
  return "Ahora mismo";
}

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function AccountsListTable({
  accounts,
  total,
  isLoading,
  isFetching,
  error,
  onRetry,
  page,
  pageSize,
  onPageChange,
}: AccountsListTableProps) {
  const utils = trpc.useUtils();

  const deactivateUser = trpc.admin.deactivateUser.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.listAccounts.invalidate(),
        utils.admin.listUsers.invalidate(),
        utils.admin.stats.invalidate(),
      ]);
      toast.success("Cuenta desactivada.");
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });

  const reactivateUser = trpc.admin.reactivateUser.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.listAccounts.invalidate(),
        utils.admin.listUsers.invalidate(),
        utils.admin.stats.invalidate(),
      ]);
      toast.success("Cuenta reactivada.");
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrevious = page > 0;
  const hasMore = page < totalPages - 1;
  const rangeLabel =
    total === 0
      ? "0 resultados"
      : `Mostrando ${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)} de ${total}`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Cuentas unificadas</CardTitle>
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
      </CardHeader>

      <CardContent className="space-y-4 p-0 px-6 pb-6">
        {error ? (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p>No se pudo cargar el listado de cuentas.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onRetry}
                  className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/40"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="px-6">Usuario</TableHead>
              <TableHead className="px-6">Tipo de cuenta</TableHead>
              <TableHead className="px-6">Rol de sistema</TableHead>
              <TableHead className="px-6">Organizaciones</TableHead>
              <TableHead className="px-6">Relaciones</TableHead>
              <TableHead className="px-6">Estado</TableHead>
              <TableHead className="px-6">Registrado</TableHead>
              <TableHead className="px-6 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [...Array(6)].map((_, index) => (
                  <TableRow key={`accounts-skeleton-${index}`}>
                    <TableCell className="px-6" colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : null}

            {!isLoading && accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No se encontraron cuentas que coincidan con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading
              ? accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={account.user.image ?? undefined} />
                          <AvatarFallback>
                            {(account.displayName || account.user.email)
                              .charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{account.displayName}</p>
                          <p className="text-sm text-muted-foreground">{account.user.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="px-6">
                      <Badge variant={getAccountTypeBadgeVariant(account.accountType)}>
                        {ACCOUNT_TYPE_LABELS[account.accountType]}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-6">
                      <Badge variant={getSystemRoleBadgeVariant(account.systemRole)}>
                        {SYSTEM_ROLE_LABELS[account.systemRole]}
                      </Badge>
                    </TableCell>

                    <TableCell className="px-6 text-sm text-muted-foreground">
                      {account.organizationRoles.length > 0 ? (
                        <div>
                          <p className="font-medium text-foreground">
                            {account.organizationRoles.length} org(s)
                          </p>
                          <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                            {account.organizationRoles
                              .slice(0, 2)
                              .map((membership) =>
                                `${membership.organization.name} (${ORGANIZATION_TYPE_LABELS[membership.organization.organizationType]})`,
                              )
                              .join(", ")}
                          </p>
                        </div>
                      ) : (
                        <span>Ninguna</span>
                      )}
                    </TableCell>

                    <TableCell className="px-6 text-sm">
                      {account.relationshipSummary.total > 0 ? (
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">
                            {account.relationshipSummary.total} total
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {account.relationshipSummary.active} activas · {account.relationshipSummary.pending} pendientes
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sin relaciones</span>
                      )}
                    </TableCell>

                    <TableCell className="px-6">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={account.isActive ? "success" : "destructive"}>
                          {account.isActive ? "Activa" : "Inactiva"}
                        </Badge>
                        <Badge variant={account.isVerified ? "info" : "secondary"}>
                          {account.isVerified ? "Verificada" : "No verificada"}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="px-6 text-sm text-muted-foreground">
                      {formatRelativeTime(new Date(account.createdAt))}
                    </TableCell>

                    <TableCell className="px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Acciones para ${account.user.email}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>{account.user.email}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/accounts/${account.userId}`}>Ver detalle</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              void copyToClipboard(account.user.email).then((ok) => {
                                if (ok) {
                                  toast.success("Email copiado al portapapeles.");
                                  return;
                                }
                                toast.error("No se pudo copiar el email.");
                              });
                            }}
                          >
                            <Copy className="h-4 w-4" />
                            Copiar email
                          </DropdownMenuItem>
                          {account.isActive ? (
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault();
                                deactivateUser.mutate({ userId: account.userId });
                              }}
                              disabled={deactivateUser.isPending}
                            >
                              Desactivar cuenta
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onSelect={(event) => {
                                event.preventDefault();
                                reactivateUser.mutate({ userId: account.userId });
                              }}
                              disabled={reactivateUser.isPending}
                            >
                              Reactivar cuenta
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages} · {total} resultados
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={!hasPrevious || isFetching}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={!hasMore || isFetching}
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
