"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SystemRole, OrganizationType, LegalEntityType } from "@prisma/client";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    return date.toLocaleDateString();
  } else if (diffDays > 0) {
    return `${diffDays} día${diffDays === 1 ? "" : "s"}`;
  } else if (diffHours > 0) {
    return `${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  } else if (diffMins > 0) {
    return `${diffMins} minuto${diffMins === 1 ? "" : "s"}`;
  } else {
    return "Ahora mismo";
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
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function UserListTable({
  users,
  total,
  isLoading,
  page,
  pageSize,
  onPageChange,
}: UserListTableProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
          No se encontraron usuarios que coincidan con tu búsqueda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
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
            {users.map((profile) => (
              <TableRow
                key={profile.id}
              >
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
                      {profile.organizationRoles.length > 0 && (
                        <p className="text-xs truncate max-w-[150px]">
                          {profile.organizationRoles[0].organization.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-400">Ninguna</span>
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
                <TableCell className="px-6 text-right text-sm font-medium">
                  <Link
                    href={`/admin/users/${profile.userId}`}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-card px-4 py-3 flex items-center justify-between border-t sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                Mostrando{" "}
                <span className="font-medium">{page * pageSize + 1}</span> a{" "}
                <span className="font-medium">
                  {Math.min((page + 1) * pageSize, total)}
                </span>{" "}
                de <span className="font-medium">{total}</span> resultados
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Página {page + 1} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function RoleBadge({ role }: { role: SystemRole }) {
  const variants: Record<
    SystemRole,
    "destructive" | "info" | "secondary"
  > = {
    SUPERADMIN: "destructive",
    STAFF: "info",
    CUSTOMER: "secondary",
  };

  const labels: Record<SystemRole, string> = {
    SUPERADMIN: "Superadmin",
    STAFF: "Personal",
    CUSTOMER: "Cliente",
  };

  return (
    <Badge variant={variants[role]}>
      {labels[role]}
    </Badge>
  );
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
      {isVerified && (
        <Badge variant="info">
          Verificado
        </Badge>
      )}
    </div>
  );
}
