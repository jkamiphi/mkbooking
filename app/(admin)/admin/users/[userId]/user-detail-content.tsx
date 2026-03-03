"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Building2,
  Shield,
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
} from "lucide-react";
import type { SystemRole } from "@prisma/client";

interface UserDetailContentProps {
  userId: string;
}

export function UserDetailContent({ userId }: UserDetailContentProps) {
  const utils = trpc.useUtils();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SystemRole | null>(null);

  const {
    data: user,
    isLoading,
    error,
  } = trpc.admin.getUserDetail.useQuery({ userId });

  const updateRole = trpc.admin.updateSystemRole.useMutation({
    onSuccess: () => {
      utils.admin.getUserDetail.invalidate({ userId });
      utils.admin.listUsers.invalidate();
      setShowRoleModal(false);
    },
  });

  const verifyUser = trpc.admin.verifyUser.useMutation({
    onSuccess: () => {
      utils.admin.getUserDetail.invalidate({ userId });
    },
  });

  const deactivateUser = trpc.admin.deactivateUser.useMutation({
    onSuccess: () => {
      utils.admin.getUserDetail.invalidate({ userId });
      utils.admin.listUsers.invalidate();
    },
  });

  const reactivateUser = trpc.admin.reactivateUser.useMutation({
    onSuccess: () => {
      utils.admin.getUserDetail.invalidate({ userId });
      utils.admin.listUsers.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-1/4" />
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
          <div className="h-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg">
        User not found or an error occurred.
      </div>
    );
  }

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.user.name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
              {displayName}
            </h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {user.user.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!user.isVerified && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => verifyUser.mutate({ userId })}
              disabled={verifyUser.isPending}
            >
              <UserCheck className="h-4 w-4 mr-1" />
              {verifyUser.isPending ? "Verifying..." : "Verify"}
            </Button>
          )}
          {user.isActive ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => deactivateUser.mutate({ userId })}
              disabled={deactivateUser.isPending}
              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <UserX className="h-4 w-4 mr-1" />
              {deactivateUser.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => reactivateUser.mutate({ userId })}
              disabled={reactivateUser.isPending}
              className="text-green-600 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
            >
              <UserCheck className="h-4 w-4 mr-1" />
              {reactivateUser.isPending ? "Reactivating..." : "Reactivate"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Info */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Profile Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400">
                  First Name
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {user.firstName || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400">
                  Last Name
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {user.lastName || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {user.user.email}
                </p>
              </div>
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {user.phone || "-"}
                </p>
              </div>
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400">
                  Locale
                </label>
                <p className="text-neutral-900 dark:text-white">{user.locale}</p>
              </div>
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400">
                  Timezone
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {user.timezone}
                </p>
              </div>
            </div>
          </div>

          {/* Organizations */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organizations
            </h2>
            {user.organizationRoles.length > 0 ? (
              <div className="space-y-3">
                {user.organizationRoles.map((membership) => (
                  <div
                    key={membership.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {membership.organization.name}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {membership.organization.organizationType} -{" "}
                        {membership.organization.legalEntityType}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 rounded">
                      {membership.role}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-neutral-500 dark:text-neutral-400">
                No organizations
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Status
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Account Status
                </span>
                <span
                  className={`flex items-center gap-1 ${user.isActive ? "text-green-600" : "text-red-600"}`}
                >
                  {user.isActive ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {user.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Verified
                </span>
                <span
                  className={`flex items-center gap-1 ${user.isVerified ? "text-green-600" : "text-neutral-400"}`}
                >
                  {user.isVerified ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Yes
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      No
                    </>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">
                  Email Verified
                </span>
                <span
                  className={`flex items-center gap-1 ${user.user.emailVerified ? "text-green-600" : "text-neutral-400"}`}
                >
                  {user.user.emailVerified ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Yes
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      No
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* System Role Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Role
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRole(user.systemRole);
                  setShowRoleModal(true);
                }}
              >
                Change
              </Button>
            </div>
            <RoleBadge role={user.systemRole} />
          </div>

          {/* Dates Card */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Dates
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400">
                  Account Created
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {new Date(user.user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400">
                  Profile Created
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
              <div>
                <label className="text-sm text-neutral-500 dark:text-neutral-400">
                  Last Updated
                </label>
                <p className="text-neutral-900 dark:text-white">
                  {new Date(user.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Change System Role
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              Select a new system role for{" "}
              <span className="font-medium">{displayName}</span>
            </p>
            <div className="space-y-2 mb-6">
              {(
                [
                  "CUSTOMER",
                  "STAFF",
                  "DESIGNER",
                  "SALES",
                  "OPERATIONS_PRINT",
                  "INSTALLER",
                  "SUPERADMIN",
                ] as SystemRole[]
              ).map(
                (role) => (
                  <label
                    key={role}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRole === role
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={selectedRole === role}
                      onChange={() => setSelectedRole(role)}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">
                        {role === "SUPERADMIN"
                          ? "Superadmin"
                          : role === "STAFF"
                            ? "Staff"
                            : role === "DESIGNER"
                              ? "Diseñador"
                            : role === "SALES"
                              ? "Ventas"
                            : role === "OPERATIONS_PRINT"
                              ? "Impresión"
                            : role === "INSTALLER"
                              ? "Instalador"
                            : "Customer"}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {role === "SUPERADMIN"
                          ? "Full platform access"
                          : role === "STAFF"
                            ? "Limited admin access"
                            : role === "DESIGNER"
                              ? "Design workflow access for proofs and artwork review"
                            : role === "SALES"
                              ? "Commercial review access for orders and requests"
                            : role === "OPERATIONS_PRINT"
                              ? "Print workflow access for final production confirmation"
                            : role === "INSTALLER"
                              ? "Operational installer role for field execution tasks"
                            : "Regular user access"}
                      </p>
                    </div>
                  </label>
                )
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRoleModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  if (selectedRole) {
                    updateRole.mutate({ userId, systemRole: selectedRole });
                  }
                }}
                disabled={
                  updateRole.isPending || selectedRole === user.systemRole
                }
              >
                {updateRole.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
            {updateRole.error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {updateRole.error.message}
              </p>
            )}
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
    DESIGNER: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400",
    SALES: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400",
    OPERATIONS_PRINT: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-400",
    INSTALLER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400",
    CUSTOMER:
      "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400",
  };

  const labels: Record<SystemRole, string> = {
    SUPERADMIN: "Superadmin",
    STAFF: "Staff",
    DESIGNER: "Diseño",
    SALES: "Ventas",
    OPERATIONS_PRINT: "Impresión",
    INSTALLER: "Instalador",
    CUSTOMER: "Customer",
  };

  const descriptions: Record<SystemRole, string> = {
    SUPERADMIN: "Full platform access - can manage all settings and users",
    STAFF: "Limited admin access - can view and manage users",
    DESIGNER: "Design workflow access - can review artworks and publish color proofs",
    SALES: "Commercial access - can validate orders and purchase orders",
    OPERATIONS_PRINT: "Print workflow access - can confirm final production and evidences",
    INSTALLER: "Operational installer role - executes field work orders",
    CUSTOMER: "Regular user - can only access customer features",
  };

  return (
    <div>
      <span
        className={`inline-block px-3 py-1.5 text-sm font-medium rounded-lg ${styles[role]}`}
      >
        {labels[role]}
      </span>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        {descriptions[role]}
      </p>
    </div>
  );
}
