"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { Users, Building2, UserCheck, UserPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardContent() {
  const { data: stats, isLoading } = trpc.admin.stats.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-3">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-1/3" />
            </CardHeader>
          </Card>
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
            className="rounded-xl"
          >
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40"
          >
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Gestionar Usuarios</p>
              <p className="text-sm text-muted-foreground">
                Ver y gestionar todos los usuarios
              </p>
            </div>
          </Link>
          <Link
            href="/admin/organizations"
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40"
          >
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Organizaciones</p>
              <p className="text-sm text-muted-foreground">
                Ver todas las organizaciones
              </p>
            </div>
          </Link>
          <Link
            href="/admin/users?isActive=false"
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/40"
          >
            <UserCheck className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Usuarios Inactivos</p>
              <p className="text-sm text-muted-foreground">
                {stats?.inactiveUsers ?? 0} usuarios por revisar
              </p>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Desglose de Usuarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Clientes</span>
              <span className="font-semibold text-foreground">
                {stats?.customerUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Personal</span>
              <span className="font-semibold text-foreground">
                {stats?.staffUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Con Organizaciones</span>
              <span className="font-semibold text-foreground">
                {stats?.customersWithOrgs ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado de Cuenta</CardTitle>
            <CardDescription>
              Visión rápida de actividad y validaciones de usuarios.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Activo</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {stats?.activeUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Inactivo</span>
              <span className="font-semibold text-red-600 dark:text-red-400">
                {stats?.inactiveUsers ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Nuevos (Últimos 7 días)
              </span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {stats?.recentUsers ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
