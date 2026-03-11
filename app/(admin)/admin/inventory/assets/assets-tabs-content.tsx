"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetsContent } from "./assets-content";
import { AssetsControlContent } from "./assets-control-content";

export function AssetsTabsContent() {
  return (
    <Tabs defaultValue="operational" className="space-y-4">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border border-neutral-200 bg-white p-1 sm:w-auto">
        <TabsTrigger value="operational" className="px-4 py-2 text-sm">
          Vista Operativa
        </TabsTrigger>
        <TabsTrigger value="control" className="px-4 py-2 text-sm">
          Vista Control
        </TabsTrigger>
      </TabsList>

      <TabsContent value="operational">
        <AssetsContent />
      </TabsContent>

      <TabsContent value="control">
        <AssetsControlContent />
      </TabsContent>
    </Tabs>
  );
}
