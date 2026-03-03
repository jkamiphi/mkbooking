export interface ChecklistTemplateItem {
  code: string;
  label: string;
  isRequired: boolean;
}

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
  {
    code: "VERIFY_SURFACE",
    label: "Superficie limpia y lista para instalación",
    isRequired: true,
  },
  {
    code: "VERIFY_ARTWORK_ORIENTATION",
    label: "Arte instalado con orientación correcta",
    isRequired: true,
  },
  {
    code: "VERIFY_TENSION_AND_ALIGNMENT",
    label: "Tensión y alineación validadas",
    isRequired: true,
  },
  {
    code: "VERIFY_STRUCTURE_CONDITION",
    label: "Estructura y anclajes en condición segura",
    isRequired: true,
  },
  {
    code: "VERIFY_SITE_CLEANUP",
    label: "Área intervenida limpia y sin residuos",
    isRequired: true,
  },
];

const CHECKLIST_BY_STRUCTURE_TYPE: Record<string, ChecklistTemplateItem[]> = {
  UNIPOLAR: DEFAULT_CHECKLIST_TEMPLATE,
  VALLA: DEFAULT_CHECKLIST_TEMPLATE,
  MUPI: [
    {
      code: "VERIFY_GLASS_OR_FRAME",
      label: "Cristal o marco frontal limpio y sin daños",
      isRequired: true,
    },
    {
      code: "VERIFY_INSERTION_AND_LOCK",
      label: "Lámina insertada y cerraduras verificadas",
      isRequired: true,
    },
    {
      code: "VERIFY_LIGHTING",
      label: "Iluminación del módulo verificada",
      isRequired: true,
    },
    {
      code: "VERIFY_ALIGNMENT",
      label: "Alineación y ajuste final validados",
      isRequired: true,
    },
  ],
  PANTALLA_DIGITAL: [
    {
      code: "VERIFY_PANEL_CLEANLINESS",
      label: "Pantalla y marco limpios",
      isRequired: true,
    },
    {
      code: "VERIFY_POWER_AND_SIGNAL",
      label: "Energía y señal operativas",
      isRequired: true,
    },
    {
      code: "VERIFY_CONTENT_RENDER",
      label: "Contenido desplegado correctamente",
      isRequired: true,
    },
    {
      code: "VERIFY_PHYSICAL_SAFETY",
      label: "Inspección física de seguridad completada",
      isRequired: true,
    },
  ],
};

export function normalizeStructureTypeKey(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveChecklistTemplateByStructureType(
  structureTypeName?: string | null
): ChecklistTemplateItem[] {
  const normalizedKey = normalizeStructureTypeKey(structureTypeName);
  const template = CHECKLIST_BY_STRUCTURE_TYPE[normalizedKey] ?? DEFAULT_CHECKLIST_TEMPLATE;

  return template.map((item) => ({ ...item }));
}
