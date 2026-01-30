"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow">
        <div className="animate-pulse p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-neutral-200 dark:bg-neutral-800 rounded"
            />
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-8 text-center">
        <p className="text-neutral-600 dark:text-neutral-400">
          No se encontraron usuarios que coincidan con tu búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800">
          <thead className="bg-neutral-50 dark:bg-neutral-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Usuario
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Organizaciones
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Registrado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
            {users.map((profile) => (
              <tr
                key={profile.id}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      {profile.user.image ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={profile.user.image}
                          alt=""
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {profile.user.name?.charAt(0)?.toUpperCase() ||
                              profile.user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        {profile.firstName && profile.lastName
                          ? `${profile.firstName} ${profile.lastName}`
                          : profile.user.name}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {profile.user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <RoleBadge role={profile.systemRole} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
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
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadges
                    isActive={profile.isActive}
                    isVerified={profile.isVerified}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                  {formatRelativeTime(new Date(profile.createdAt))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/admin/users/${profile.userId}`}
                    className="text-blue-600 hover:text-blue-500"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-neutral-900 px-4 py-3 flex items-center justify-between border-t border-neutral-200 dark:border-neutral-800 sm:px-6">
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
    </div>
  );
}

function RoleBadge({ role }: { role: SystemRole }) {
  const styles: Record<SystemRole, string> = {
    SUPERADMIN:
      "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400",
    STAFF: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400",
    CUSTOMER:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const labels: Record<SystemRole, string> = {
    SUPERADMIN: "Superadmin",
    STAFF: "Personal",
    CUSTOMER: "Cliente",
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded ${styles[role]}`}>
      {labels[role]}
    </span>
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
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded ${
          isActive
            ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
            : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
        }`}
      >
        {isActive ? "Activo" : "Inactivo"}
      </span>
      {isVerified && (
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400">
          Verificado
        </span>
      )}
    </div>
  );
}
