export const metadata = {
  title: "Catalog - Admin",
  description: "Manage catalog and pricing",
};

const cards = [
  {
    href: "/admin/catalog/faces",
    title: "Faces",
    description: "Publish faces and manage catalog details.",
  },
  {
    href: "/admin/catalog/pricing",
    title: "Pricing",
    description: "Global prices, promos, and special prices.",
  },
  {
    href: "/admin/catalog/holds",
    title: "Holds",
    description: "Manage active holds and availability blocks.",
  },
];

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Catalog
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Publish faces, pricing, promos, and holds.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {card.title}
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {card.description}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
