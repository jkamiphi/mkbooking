"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderDetailTabsProps {
  detailContent: ReactNode;
  designContent: ReactNode;
  trackingContent: ReactNode;
  caseFileContent: ReactNode;
  defaultTab?: "detail" | "tracking" | "design" | "case-file";
}

export function OrderDetailTabs({
  detailContent,
  designContent,
  trackingContent,
  caseFileContent,
  defaultTab = "detail",
}: OrderDetailTabsProps) {
  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="mb-3 inline-flex h-auto w-full gap-1 rounded-xl border border-neutral-200 bg-white p-1 sm:w-auto">
        <TabsTrigger value="detail" className="px-4 py-2 text-sm">
          Detalle
        </TabsTrigger>
        <TabsTrigger value="tracking" className="px-4 py-2 text-sm">
          Seguimiento
        </TabsTrigger>
        <TabsTrigger value="design" className="px-4 py-2 text-sm">
          Diseño
        </TabsTrigger>
        <TabsTrigger value="case-file" className="px-4 py-2 text-sm">
          Expediente
        </TabsTrigger>
      </TabsList>
      <TabsContent value="detail">{detailContent}</TabsContent>
      <TabsContent value="tracking">{trackingContent}</TabsContent>
      <TabsContent value="design">{designContent}</TabsContent>
      <TabsContent value="case-file">{caseFileContent}</TabsContent>
    </Tabs>
  );
}
