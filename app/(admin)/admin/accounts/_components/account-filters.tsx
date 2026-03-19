"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  OrganizationRelationshipStatus,
  OrganizationType,
  SystemRole,
  UserAccountType,
} from "@prisma/client";
import {
  countActiveFilters,
  toSummaryChips,
} from "@/lib/navigation/filter-state";
import {
  FilterSheetPanel,
  FilterSheetSection,
  FilterSheetToolbar,
  FilterSheetTriggerButton,
} from "@/components/ui/filter-sheet";
import { SelectNative } from "@/components/ui/select-native";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import {
  ACCOUNT_TYPE_LABELS,
  ORGANIZATION_TYPE_LABELS,
  RELATIONSHIP_STATUS_LABELS,
  SYSTEM_ROLE_LABELS,
} from "../_lib/account-labels";

interface AccountFiltersValue {
  search?: string;
  systemRole?: SystemRole;
  accountType?: UserAccountType;
  isActive?: boolean;
  organizationType?: OrganizationType;
  relationshipStatus?: OrganizationRelationshipStatus;
}

interface AccountFiltersProps {
  filters: AccountFiltersValue;
  onFiltersChange: (filters: AccountFiltersValue) => void;
  actions?: React.ReactNode;
}

export function AccountFilters({
  filters,
  onFiltersChange,
  actions,
}: AccountFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<AccountFiltersValue>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  function applyFilters() {
    onFiltersChange({
      search: draftFilters.search?.trim() || undefined,
      systemRole: draftFilters.systemRole,
      accountType: draftFilters.accountType,
      isActive: draftFilters.isActive,
      organizationType: draftFilters.organizationType,
      relationshipStatus: draftFilters.relationshipStatus,
    });
    setIsOpen(false);
  }

  function clearFilters() {
    const cleared: AccountFiltersValue = {
      search: undefined,
      systemRole: undefined,
      accountType: undefined,
      isActive: undefined,
      organizationType: undefined,
      relationshipStatus: undefined,
    };
    setDraftFilters(cleared);
    onFiltersChange(cleared);
    setIsOpen(false);
  }

  const activeCount = countActiveFilters({
    search: filters.search,
    systemRole: filters.systemRole,
    accountType: filters.accountType,
    isActive:
      filters.isActive === undefined ? undefined : String(filters.isActive),
    organizationType: filters.organizationType,
    relationshipStatus: filters.relationshipStatus,
  });

  const summaryChips = useMemo(
    () =>
      toSummaryChips(filters, [
        {
          key: "search",
          isActive: (state) => Boolean(state.search),
          getLabel: (state) => `Buscar: ${state.search}`,
        },
        {
          key: "systemRole",
          isActive: (state) => Boolean(state.systemRole),
          getLabel: (state) =>
            `Rol sistema: ${state.systemRole ? SYSTEM_ROLE_LABELS[state.systemRole] : ""}`,
        },
        {
          key: "accountType",
          isActive: (state) => Boolean(state.accountType),
          getLabel: (state) =>
            `Tipo cuenta: ${state.accountType ? ACCOUNT_TYPE_LABELS[state.accountType] : ""}`,
        },
        {
          key: "isActive",
          isActive: (state) => state.isActive !== undefined,
          getLabel: (state) => `Estado: ${state.isActive ? "Activo" : "Inactivo"}`,
        },
        {
          key: "organizationType",
          isActive: (state) => Boolean(state.organizationType),
          getLabel: (state) =>
            `Tipo organización: ${state.organizationType ? ORGANIZATION_TYPE_LABELS[state.organizationType] : ""}`,
        },
        {
          key: "relationshipStatus",
          isActive: (state) => Boolean(state.relationshipStatus),
          getLabel: (state) =>
            `Relación: ${state.relationshipStatus ? RELATIONSHIP_STATUS_LABELS[state.relationshipStatus] : ""}`,
        },
      ]).map((chip) => ({
        ...chip,
        onRemove: () => {
          if (chip.key === "search") {
            onFiltersChange({ ...filters, search: undefined });
            return;
          }
          if (chip.key === "systemRole") {
            onFiltersChange({ ...filters, systemRole: undefined });
            return;
          }
          if (chip.key === "accountType") {
            onFiltersChange({ ...filters, accountType: undefined });
            return;
          }
          if (chip.key === "isActive") {
            onFiltersChange({ ...filters, isActive: undefined });
            return;
          }
          if (chip.key === "organizationType") {
            onFiltersChange({ ...filters, organizationType: undefined });
            return;
          }
          onFiltersChange({ ...filters, relationshipStatus: undefined });
        },
      })),
    [filters, onFiltersChange],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <FilterSheetToolbar
          summaryChips={summaryChips}
          onClearAll={activeCount > 0 ? clearFilters : undefined}
        >
          <SheetTrigger asChild>
            <FilterSheetTriggerButton activeCount={activeCount} />
          </SheetTrigger>
        </FilterSheetToolbar>

        <FilterSheetPanel
          title="Filtrar cuentas"
          description="Segmenta por tipo de cuenta, rol, estado y relaciones agencia-marca."
          onApply={applyFilters}
          onClear={clearFilters}
        >
          <FilterSheetSection title="Búsqueda" description="Nombre, email o nombre de organización.">
            <input
              type="text"
              placeholder="Nombre, email u organización"
              value={draftFilters.search ?? ""}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value || undefined,
                }))
              }
              className="h-10 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none transition focus:border-[#0359A8]"
            />
          </FilterSheetSection>

          <FilterSheetSection title="Rol de sistema">
            <SelectNative
              value={draftFilters.systemRole ?? "ALL"}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  systemRole:
                    event.target.value === "ALL"
                      ? undefined
                      : (event.target.value as SystemRole),
                }))
              }
            >
              <option value="ALL">Todos los roles</option>
              {Object.entries(SYSTEM_ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </FilterSheetSection>

          <FilterSheetSection title="Tipo de cuenta">
            <SelectNative
              value={draftFilters.accountType ?? "ALL"}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  accountType:
                    event.target.value === "ALL"
                      ? undefined
                      : (event.target.value as UserAccountType),
                }))
              }
            >
              <option value="ALL">Todos</option>
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </FilterSheetSection>

          <FilterSheetSection title="Estado de cuenta">
            <SelectNative
              value={
                draftFilters.isActive === true
                  ? "ACTIVE"
                  : draftFilters.isActive === false
                    ? "INACTIVE"
                    : "ALL"
              }
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  isActive:
                    event.target.value === "ACTIVE"
                      ? true
                      : event.target.value === "INACTIVE"
                        ? false
                        : undefined,
                }))
              }
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="INACTIVE">Inactivo</option>
            </SelectNative>
          </FilterSheetSection>

          <FilterSheetSection title="Tipo de organización">
            <SelectNative
              value={draftFilters.organizationType ?? "ALL"}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  organizationType:
                    event.target.value === "ALL"
                      ? undefined
                      : (event.target.value as OrganizationType),
                }))
              }
            >
              <option value="ALL">Todos los tipos</option>
              {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </FilterSheetSection>

          <FilterSheetSection title="Estado de relación agencia-marca">
            <SelectNative
              value={draftFilters.relationshipStatus ?? "ALL"}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  relationshipStatus:
                    event.target.value === "ALL"
                      ? undefined
                      : (event.target.value as OrganizationRelationshipStatus),
                }))
              }
            >
              <option value="ALL">Todas</option>
              {Object.entries(RELATIONSHIP_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectNative>
          </FilterSheetSection>
        </FilterSheetPanel>
      </Sheet>

      {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}
