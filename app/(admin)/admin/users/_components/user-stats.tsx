"use client";

import { Users, UserCheck, UserX, Shield } from "lucide-react";

interface UserStatsProps {
  stats?: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    staffUsers: number;
    customerUsers: number;
  };
  isLoading: boolean;
}

export function UserStats({ stats, isLoading }: UserStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-900 rounded-lg shadow p-4 animate-pulse"
          >
            <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2 mb-2" />
            <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      name: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/50",
    },
    {
      name: "Active",
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/50",
    },
    {
      name: "Inactive",
      value: stats?.inactiveUsers ?? 0,
      icon: UserX,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/50",
    },
    {
      name: "Staff",
      value: stats?.staffUsers ?? 0,
      icon: Shield,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((stat) => (
        <div
          key={stat.name}
          className="bg-white dark:bg-neutral-900 rounded-lg shadow p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {stat.name}
              </p>
              <p className="text-xl font-bold text-neutral-900 dark:text-white">
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
