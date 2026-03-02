"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderDetailTabsProps {
  detailContent: ReactNode;
  designContent: ReactNode;
}

export function OrderDetailTabs({ detailContent, designContent }: OrderDetailTabsProps) {
  return (
    <Tabs defaultValue="detail" className="w-full">
      <TabsList className="mb-3 inline-flex h-auto w-full gap-1 rounded-xl border border-neutral-200 bg-white p-1 sm:w-auto">
        <TabsTrigger value="detail" className="px-4 py-2 text-sm">
          Detalle
        </TabsTrigger>
        <TabsTrigger value="design" className="px-4 py-2 text-sm">
          Diseno
        </TabsTrigger>
      </TabsList>
      <TabsContent value="detail">{detailContent}</TabsContent>
      <TabsContent value="design">{designContent}</TabsContent>
    </Tabs>
  );
}
