"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, Shield } from "lucide-react";
import type { SystemRole } from "@prisma/client";
import {
  getAdminNavigationDefaultExpandedGroups,
  getAdminNavigationByRole,
  getAdminNavigationGroupActiveChildHref,
  getSystemRoleLabel,
  isAdminNavigationGroup,
  isAdminNavigationHrefActive,
} from "./admin-navigation";

interface AdminSidebarProps {
  systemRole: SystemRole;
}

export function AdminSidebar({ systemRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const navigation = useMemo(
    () => getAdminNavigationByRole(systemRole),
    [systemRole]
  );
  const defaultExpandedGroups = useMemo(
    () => getAdminNavigationDefaultExpandedGroups(navigation, pathname),
    [navigation, pathname]
  );
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  function isGroupExpanded(groupKey: string) {
    return expandedGroups[groupKey] ?? defaultExpandedGroups[groupKey] ?? false;
  }

  function toggleGroup(groupKey: string) {
    const currentValue = isGroupExpanded(groupKey);
    setExpandedGroups((previousState) => ({
      ...previousState,
      [groupKey]: !currentValue,
    }));
  }

  return (
    <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:border-r lg:border-neutral-200/90 dark:lg:border-neutral-800 lg:bg-white/90 dark:lg:bg-neutral-900/70 lg:backdrop-blur">
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-5 space-y-1.5">
        {navigation.map((node) => {
          if (!isAdminNavigationGroup(node)) {
            const isActive = isAdminNavigationHrefActive(pathname, node.href);

            return (
              <Link
                key={node.key}
                href={node.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                {node.icon ? (
                  <node.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300"
                    )}
                  />
                ) : null}
                {node.name}
              </Link>
            );
          }

          const activeChildHref = getAdminNavigationGroupActiveChildHref(
            pathname,
            node
          );
          const isGroupActive = activeChildHref !== null;
          const isExpanded = isGroupExpanded(node.key);

          return (
            <div key={node.key} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(node.key)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isGroupActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                )}
                aria-expanded={isExpanded}
                aria-controls={`admin-nav-group-${node.key}`}
              >
                {node.icon ? (
                  <node.icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isGroupActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-neutral-500 group-hover:text-neutral-700 dark:text-neutral-500 dark:group-hover:text-neutral-300"
                    )}
                  />
                ) : null}
                <span className="truncate">{node.name}</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    isExpanded ? "rotate-180" : ""
                  )}
                />
              </button>

              {isExpanded ? (
                <div
                  id={`admin-nav-group-${node.key}`}
                  className="ml-7 space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-800"
                >
                  {node.children.map((child) => {
                    const isChildActive = activeChildHref === child.href;

                    return (
                      <Link
                        key={child.key}
                        href={child.href}
                        className={cn(
                          "flex items-center rounded-lg px-2 py-2 text-sm transition-colors",
                          isChildActive
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
                        )}
                        aria-current={isChildActive ? "page" : undefined}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      {/* Role Badge */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-neutral-700 dark:text-neutral-300">
            {getSystemRoleLabel(systemRole)}
          </span>
        </div>
      </div>
    </aside>
  );
}
