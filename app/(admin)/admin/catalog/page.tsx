export const metadata = {
  title: "Catálogo - Admin",
  description: "Gestionar catálogo y precios",
};

const cards = [
  {
    href: "/admin/catalog/faces",
    title: "Caras",
    description: "Publicar caras y gestionar detalles del catálogo.",
  },
  {
    href: "/admin/catalog/pricing",
    title: "Precios",
    description: "Precios globales, promociones y precios especiales.",
  },
  {
    href: "/admin/catalog/holds",
    title: "Reservas",
    description: "Gestionar reservas activas y bloqueos de disponibilidad.",
  },
];

export default function CatalogPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Catálogo
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Publicar caras, precios, promociones y reservas.
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
