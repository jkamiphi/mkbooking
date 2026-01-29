export const metadata = {
  title: "Catalog Pricing - Admin",
  description: "Manage catalog pricing",
};

const items = [
  { href: "/admin/catalog/pricing/rules", label: "Price Rules" },
  { href: "/admin/catalog/pricing/promos", label: "Promos" },
];

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
          Pricing
        </h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Global prices, promos, and special prices.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {item.label}
            </h2>
          </a>
        ))}
      </div>
    </div>
  );
}
