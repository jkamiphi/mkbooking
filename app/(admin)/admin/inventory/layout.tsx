import { InventoryNav } from "./_components/inventory-nav";

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <InventoryNav />
      {children}
    </div>
  );
}
