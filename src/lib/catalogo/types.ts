export type CatalogProduct = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  priceBrl: number | null;
  category: string | null;
  attributes: Record<string, unknown>;
  source: string;
  isActive: boolean;
  sortOrder: number;
};

export type ProductDraft = Omit<
  CatalogProduct,
  "id" | "isActive" | "sortOrder" | "source"
>;
