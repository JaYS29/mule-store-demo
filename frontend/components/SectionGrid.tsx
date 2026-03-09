import ProductCard from "@/components/ProductCard";

type Money = {
  amount: number;
  currency: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  storeName?: string;
  price: Money;
};

type Section = {
  id: string;
  title: string;
  products: Product[];
};

export default function SectionGrid({ section }: { section: Section }) {
  const showStoreName = section.title === "Popular products";

  return (
    <section className="py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {section.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            showStoreName={showStoreName}
          />
        ))}
      </div>
    </section>
  );
}
