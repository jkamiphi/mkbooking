"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { Users, Building2, UserCheck, UserPlus } from "lucide-react";

export function DashboardContent() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 animate-pulse"
          >
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 mb-4" />
            <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      name: "Total de Usuarios",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      href: "/admin/users",
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
    },
    {
      name: "Usuarios Activos",
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      href: "/admin/users?isActive=true",
      color:
        "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400",
    },
    {
      name: "Personal",
      value: stats?.staffUsers ?? 0,
      icon: Building2,
      href: "/admin/users?systemRole=STAFF",
      color:
        "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
    },
    {
      name: "Nuevos Esta Semana",
      value: stats?.recentUsers ?? 0,
      icon: UserPlus,
      href: "/admin/users",
      color:
        "bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            href={stat.href}
            className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {stat.name}
                </p>
                <p className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white">
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Users className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                Gestionar Usuarios
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Ver y gestionar todos los usuarios
              </p>
            </div>
          </Link>
          <Link
            href="/admin/organizations"
            className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <Building2 className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                Organizaciones
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Ver todas las organizaciones
              </p>
            </div>
          </Link>
          <Link
            href="/admin/users?isActive=false"
            className="flex items-center gap-3 p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <UserCheck className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                Usuarios Inactivos
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {stats?.inactiveUsers ?? 0} usuarios por revisar
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Desglose de Usuarios
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Clientes
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {stats?.customerUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Personal
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {stats?.staffUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Con Organizaciones
              </span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {stats?.customersWithOrgs ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Estado de Cuenta
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Activo
              </span>
              <span className="font-semibold text-green-600 dark:text-green-400">
                {stats?.activeUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Inactivo
              </span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {stats?.inactiveUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 dark:text-neutral-400">
                Nuevos (Últimos 7 días)
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {stats?.recentUsers ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
