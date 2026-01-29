import { CatalogNav } from "./_components/catalog-nav";

export default function CatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <CatalogNav />
      {children}
    </div>
  );
}
