"use client";

import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, MoreHorizontal, RotateCcw } from "lucide-react";
import { toast } from "sonner";
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
import type { LegalEntityType, OrganizationType, SystemRole } from "@prisma/client";

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

interface UserListTableProps {
  users: Array<{
    id: string;
    userId: string;
    firstName: string | null;
    lastName: string | null;
    systemRole: SystemRole;
    isActive: boolean;
    isVerified: boolean;
    createdAt: Date;
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
    organizationRoles: Array<{
      organization: {
        id: string;
        name: string;
        organizationType: OrganizationType;
        legalEntityType: LegalEntityType;
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

export function UserListTable({
  users,
  total,
  isLoading,
  isFetching,
  error,
  onRetry,
  page,
  pageSize,
  onPageChange,
}: UserListTableProps) {
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
        <CardTitle>Lista de usuarios</CardTitle>
        <p className="text-sm text-muted-foreground">{rangeLabel}</p>
      </CardHeader>

      <CardContent className="space-y-4 p-0 px-6 pb-6">
        {error ? (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-2">
                <p>No se pudo cargar el listado de usuarios.</p>
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
              <TableHead className="px-6">Rol</TableHead>
              <TableHead className="px-6">Organizaciones</TableHead>
              <TableHead className="px-6">Estado</TableHead>
              <TableHead className="px-6">Registrado</TableHead>
              <TableHead className="px-6 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [...Array(6)].map((_, index) => (
                  <TableRow key={`users-skeleton-${index}`}>
                    <TableCell className="px-6" colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : null}

            {!isLoading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No se encontraron usuarios que coincidan con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading
              ? users.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="px-6">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.user.image ?? undefined} />
                          <AvatarFallback>
                            {profile.user.name?.charAt(0)?.toUpperCase() ||
                              profile.user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {profile.firstName && profile.lastName
                              ? `${profile.firstName} ${profile.lastName}`
                              : profile.user.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {profile.user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6">
                      <RoleBadge role={profile.systemRole} />
                    </TableCell>
                    <TableCell className="px-6 text-sm text-muted-foreground">
                      {profile.organizationRoles.length > 0 ? (
                        <div>
                          <span className="font-medium">
                            {profile.organizationRoles.length}
                          </span>{" "}
                          org(s)
                          <p className="max-w-[160px] truncate text-xs">
                            {profile.organizationRoles[0].organization.name}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Ninguna</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6">
                      <StatusBadges
                        isActive={profile.isActive}
                        isVerified={profile.isVerified}
                      />
                    </TableCell>
                    <TableCell className="px-6 text-sm text-muted-foreground">
                      {formatRelativeTime(new Date(profile.createdAt))}
                    </TableCell>
                    <TableCell className="px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Acciones para ${profile.user.email}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>{profile.user.email}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/users/${profile.userId}`}>Ver detalle</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              void copyToClipboard(profile.user.email).then((ok) => {
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
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>

        {!error && total > 0 ? (
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={!hasPrevious || isFetching}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={!hasMore || isFetching}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role: SystemRole }) {
  const variants: Record<SystemRole, "destructive" | "info" | "warning" | "secondary"> = {
    SUPERADMIN: "destructive",
    STAFF: "info",
    DESIGNER: "info",
    SALES: "warning",
    OPERATIONS_PRINT: "info",
    INSTALLER: "info",
    CUSTOMER: "secondary",
  };

  const labels: Record<SystemRole, string> = {
    SUPERADMIN: "Superadmin",
    STAFF: "Personal",
    DESIGNER: "Diseño",
    SALES: "Ventas",
    OPERATIONS_PRINT: "Impresión",
    INSTALLER: "Instalador",
    CUSTOMER: "Cliente",
  };

  return <Badge variant={variants[role]}>{labels[role]}</Badge>;
}

function StatusBadges({
  isActive,
  isVerified,
}: {
  isActive: boolean;
  isVerified: boolean;
}) {
  return (
    <div className="flex gap-1">
      <Badge variant={isActive ? "success" : "destructive"}>
        {isActive ? "Activo" : "Inactivo"}
      </Badge>
      {isVerified ? <Badge variant="info">Verificado</Badge> : null}
    </div>
  );
}
